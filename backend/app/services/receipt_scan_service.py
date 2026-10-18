import asyncio
import re
from datetime import date
from io import BytesIO

import pypdfium2 as pdfium
import pytesseract
from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.schemas.receipt_scan import ReceiptScanItem, ReceiptScanResponse


class ReceiptScanService:
    MAX_FILE_SIZE = 10 * 1024 * 1024
    MAX_PDF_PAGES = 5
    IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
    ITEM_KEYWORDS = {
        "ENGINE_OIL": ("engine oil", "motor oil", "fully synthetic", "semi synthetic"),
        "OIL_FILTER": ("oil filter",),
        "AIR_FILTER": ("air filter",),
        "CABIN_FILTER": ("cabin filter", "aircond filter", "air con filter"),
        "BRAKE_SERVICE": ("brake pad", "brake shoe", "brake service", "brake disc"),
        "BRAKE_FLUID": ("brake fluid",),
        "COOLANT": ("coolant", "radiator fluid"),
        "TRANSMISSION": ("transmission", "gear oil", "atf", "cvt fluid"),
        "BATTERY": ("battery",),
        "TYRE": ("tyre", "tire"),
        "ALIGNMENT": ("alignment", "balancing"),
        "SPARK_PLUG": ("spark plug",),
        "TIMING_BELT": ("timing belt",),
        "INSPECTION": ("inspection",),
    }

    async def scan(self, file: UploadFile) -> ReceiptScanResponse:
        content = await file.read(self.MAX_FILE_SIZE + 1)
        if not content:
            raise HTTPException(status_code=400, detail="The receipt file is empty.")
        if len(content) > self.MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Receipt file must be 10 MB or smaller.")

        content_type = file.content_type or ""
        try:
            text = await asyncio.to_thread(self._extract_text, content, content_type)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Could not read this receipt. Try a clearer image or PDF.") from exc

        if len(text.strip()) < 8:
            raise HTTPException(status_code=422, detail="No readable receipt text was found. Try a clearer image.")
        return self._parse(text)

    def _extract_text(self, content: bytes, content_type: str) -> str:
        if content_type == "application/pdf":
            if not content.startswith(b"%PDF"):
                raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")
            try:
                document = pdfium.PdfDocument(content)
            except Exception as exc:
                raise HTTPException(status_code=400, detail="The PDF could not be opened.") from exc
            if len(document) > self.MAX_PDF_PAGES:
                raise HTTPException(status_code=400, detail="PDF scanning is limited to 5 pages.")
            texts = []
            for page in document:
                width, height = page.get_size()
                scale = min(2.0, 1800 / max(width, height))
                image = page.render(scale=scale).to_pil().convert("RGB")
                texts.append(pytesseract.image_to_string(image, lang="eng"))
            document.close()
            return "\n".join(texts)

        if content_type not in self.IMAGE_TYPES:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP and PDF receipts are supported.")
        try:
            image = Image.open(BytesIO(content))
            if image.width * image.height > 40_000_000:
                raise ValueError("Image dimensions are too large")
            image.verify()
            image = Image.open(BytesIO(content)).convert("RGB")
            image.thumbnail((3000, 3000))
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
            raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc
        return pytesseract.image_to_string(image, lang="eng")

    def _parse(self, text: str) -> ReceiptScanResponse:
        lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
        lines = [line for line in lines if line]
        lowered = "\n".join(lines).lower()

        parsed_date = self._parse_date(lowered)
        mileage = self._parse_mileage(lowered)
        workshop = self._parse_workshop(lines)
        items = self._parse_items(lines)
        return ReceiptScanResponse(
            service_date=parsed_date,
            mileage_at_service=mileage,
            workshop=workshop,
            items=items,
        )

    @staticmethod
    def _parse_date(text: str) -> date | None:
        patterns = (
            (r"\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b", "%Y-%m-%d"),
            (r"\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b", "%d-%m-%Y"),
        )
        from datetime import datetime

        for pattern, fmt in patterns:
            for match in re.finditer(pattern, text):
                value = "-".join(match.groups())
                try:
                    return datetime.strptime(value, fmt).date()
                except ValueError:
                    continue
        return None

    @staticmethod
    def _parse_mileage(text: str) -> int | None:
        match = re.search(r"\b(?:mileage|odometer|miles?|km|kilomet(?:er|re)s?)\s*(?:at service)?\s*[:#-]?\s*([\d,]{3,})\b", text)
        if not match:
            return None
        value = int(match.group(1).replace(",", ""))
        return value if value < 2_000_000 else None

    @staticmethod
    def _parse_workshop(lines: list[str]) -> str | None:
        for line in lines[:8]:
            if len(line) >= 3 and re.search(r"[a-zA-Z]", line) and not re.search(r"receipt|invoice|tax|date|tel|phone|no\.?\s*[:#]", line, re.I):
                return line[:200]
        return None

    def _parse_items(self, lines: list[str]) -> list[ReceiptScanItem]:
        result: list[ReceiptScanItem] = []
        seen: set[str] = set()
        for line in lines:
            normalized = line.lower()
            for maintenance_type, keywords in self.ITEM_KEYWORDS.items():
                if maintenance_type in seen or not any(keyword in normalized for keyword in keywords):
                    continue
                amounts = re.findall(
                    r"(?:rm\s*(\d{1,6}(?:[.,]\d{2})?)|\b(\d{1,6}[.,]\d{2})\b)",
                    normalized,
                )
                amount = None
                if amounts:
                    try:
                        candidate = float((amounts[-1][0] or amounts[-1][1]).replace(",", "."))
                        if 0 <= candidate <= 1_000_000:
                            amount = candidate
                    except ValueError:
                        pass
                result.append(ReceiptScanItem(
                    type=maintenance_type,
                    description=line[:500],
                    cost=amount,
                ))
                seen.add(maintenance_type)
        return result
