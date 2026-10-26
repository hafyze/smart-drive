import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { VehiclePhoto } from "./VehiclePhoto";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface VehiclePhotoFieldProps {
    currentPhotoUrl?: string | null;
    file: File | null;
    onFileChange: (file: File | null) => void;
    onRemoveCurrent?: () => void;
    onRestoreCurrent?: () => void;
    removed?: boolean;
}

export function VehiclePhotoField({
    currentPhotoUrl,
    file,
    onFileChange,
    onRemoveCurrent,
    onRestoreCurrent,
    removed = false,
}: VehiclePhotoFieldProps) {
    const [error, setError] = useState<string>();
    const [preview, setPreview] = useState<string>();

    useEffect(() => {
        if (!file) {
            setPreview(undefined);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const chooseFile = (selected?: File) => {
        setError(undefined);
        if (!selected) return;
        if (!PHOTO_TYPES.includes(selected.type)) {
            setError("Choose a JPEG, PNG or WEBP image.");
            return;
        }
        if (selected.size > MAX_PHOTO_SIZE) {
            setError("Photo must be 10 MB or smaller.");
            return;
        }
        onFileChange(selected);
    };

    const photoUrl = preview ? null : (removed ? null : currentPhotoUrl);

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="vehicle-photo">Vehicle Photo</label>
            <div className="flex items-center gap-4">
                <div className="size-24 shrink-0 overflow-hidden rounded-lg border">
                    {preview ? (
                        <img src={preview} alt="Selected vehicle" className="h-full w-full object-cover" />
                    ) : (
                        <VehiclePhoto photoUrl={photoUrl} alt="Vehicle photo" className="h-full w-full object-cover" />
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("vehicle-photo")?.click()}>
                        <ImagePlus className="size-4" /> {currentPhotoUrl && !removed ? "Replace photo" : "Choose photo"}
                    </Button>
                    {(file || (currentPhotoUrl && !removed) || removed) && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => {
                            if (file) {
                                onFileChange(null);
                            } else if (removed) {
                                onRestoreCurrent?.();
                            } else {
                                onRemoveCurrent?.();
                            }
                        }}>
                            <X className="size-4" /> {removed ? "Undo remove" : "Remove"}
                        </Button>
                    )}
                    <input
                        id="vehicle-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                            chooseFile(event.target.files?.[0]);
                            event.target.value = "";
                        }}
                    />
                </div>
            </div>
            <p className="text-xs text-muted-foreground">
                JPEG, PNG or WEBP, up to 10 MB. Landscape photos work best; images are cropped to fit.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
