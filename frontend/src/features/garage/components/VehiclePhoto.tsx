import { useEffect, useRef, useState } from "react";
import { CarFront } from "lucide-react";
import api from "@/shared/api/axios";

interface VehiclePhotoProps {
    photoUrl?: string | null;
    alt: string;
    className?: string;
    loading?: "eager" | "lazy";
}

export function VehiclePhoto({ photoUrl, alt, className = "", loading = "lazy" }: VehiclePhotoProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loadedPhoto, setLoadedPhoto] = useState<{ photoUrl: string; src: string }>();
    const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
    const shouldLoadPrivatePhoto = loading === "eager"
        || hasEnteredViewport
        || typeof IntersectionObserver === "undefined";

    useEffect(() => {
        if (!photoUrl?.startsWith("/vehicles/") || shouldLoadPrivatePhoto) return;

        const target = containerRef.current;
        if (!target) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setHasEnteredViewport(true);
                observer.disconnect();
            }
        }, { rootMargin: "160px" });
        observer.observe(target);
        return () => observer.disconnect();
    }, [photoUrl, shouldLoadPrivatePhoto]);

    useEffect(() => {
        if (!photoUrl?.startsWith("/vehicles/") || !shouldLoadPrivatePhoto) return;

        const controller = new AbortController();
        let objectUrl: string | undefined;
        api.get<Blob>(photoUrl, { responseType: "blob", signal: controller.signal })
            .then(({ data }) => {
                objectUrl = URL.createObjectURL(data);
                setLoadedPhoto({ photoUrl, src: objectUrl });
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setLoadedPhoto({ photoUrl, src: "" });
                }
            });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [photoUrl, shouldLoadPrivatePhoto]);

    const src = !photoUrl
        ? undefined
        : photoUrl.startsWith("/vehicles/")
          ? loadedPhoto?.photoUrl === photoUrl ? loadedPhoto.src || undefined : undefined
          : photoUrl;

    return (
        <div ref={containerRef} className={`block ${className}`}>
            {src ? (
                <img src={src} alt={alt} className="size-full object-cover" loading={loading} />
            ) : (
                <div role="img" aria-label={alt} className="flex size-full items-center justify-center bg-muted">
                    <CarFront className="size-12 text-muted-foreground" aria-hidden="true" />
                </div>
            )}
        </div>
    );
}
