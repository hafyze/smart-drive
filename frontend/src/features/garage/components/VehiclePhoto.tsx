import { useEffect, useState } from "react";
import { CarFront } from "lucide-react";
import api from "@/shared/api/axios";

interface VehiclePhotoProps {
    photoUrl?: string | null;
    alt: string;
    className?: string;
}

export function VehiclePhoto({ photoUrl, alt, className = "" }: VehiclePhotoProps) {
    const [src, setSrc] = useState<string>();

    useEffect(() => {
        if (!photoUrl) {
            setSrc(undefined);
            return;
        }
        if (!photoUrl.startsWith("/vehicles/")) {
            setSrc(photoUrl);
            return;
        }

        const controller = new AbortController();
        let objectUrl: string | undefined;
        api.get<Blob>(photoUrl, { responseType: "blob", signal: controller.signal })
            .then(({ data }) => {
                objectUrl = URL.createObjectURL(data);
                setSrc(objectUrl);
            })
            .catch(() => setSrc(undefined));
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [photoUrl]);

    return src ? (
        <img src={src} alt={alt} className={className} />
    ) : (
        <div className={`flex items-center justify-center bg-muted ${className}`} aria-label={alt}>
            <CarFront className="size-12 text-muted-foreground" />
        </div>
    );
}
