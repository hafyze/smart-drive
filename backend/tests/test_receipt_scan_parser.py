import unittest
from datetime import date

from app.services.receipt_scan_service import ReceiptScanService


class ReceiptScanParserTests(unittest.TestCase):
    def setUp(self):
        self.service = ReceiptScanService()

    def test_parses_confident_receipt_fields_and_line_item_cost(self):
        draft = self.service._parse(
            """PERODUA SERVICE CENTRE
16/10/2026
Odometer: 60,000 km
Engine oil service RM 220.00
"""
        )

        self.assertEqual(draft.service_date, date(2026, 10, 16))
        self.assertEqual(draft.mileage_at_service, 60_000)
        self.assertEqual(draft.workshop, "PERODUA SERVICE CENTRE")
        self.assertEqual(len(draft.items), 1)
        self.assertEqual(draft.items[0].type.value, "ENGINE_OIL")
        self.assertEqual(draft.items[0].cost, 220.0)

    def test_leaves_uncertain_values_blank(self):
        draft = self.service._parse("THANK YOU FOR YOUR VISIT\nPLEASE COME AGAIN")

        self.assertIsNone(draft.service_date)
        self.assertIsNone(draft.mileage_at_service)
        self.assertIsNone(draft.workshop)
        self.assertEqual(draft.items, [])


if __name__ == "__main__":
    unittest.main()
