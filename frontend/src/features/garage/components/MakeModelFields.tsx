import { useId, useState } from "react";

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/shared/components/ui/combobox";
import { Label } from "@/shared/components/ui/label";
import { VEHICLE_MANUFACTURERS, getVehicleModels } from "../data/vehicleCatalog";

interface MakeModelFieldsProps {
    manufacturer: string;
    model: string;
    onManufacturerChange: (value: string) => void;
    onModelChange: (value: string) => void;
    manufacturerError?: string;
    modelError?: string;
    disabled?: boolean;
}

interface SearchableVehicleFieldProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    placeholder: string;
    disabled?: boolean;
    onChange: (value: string) => void;
}

function SearchableVehicleField({
    id,
    label,
    value,
    options,
    placeholder,
    disabled,
    onChange,
}: SearchableVehicleFieldProps) {
    const [query, setQuery] = useState("");
    const normalizedQuery = query.trim();
    const exactMatch = options.some(
        (option) => option.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase(),
    );
    const visibleOptions = value && !options.some(
        (option) => option.toLocaleLowerCase() === value.toLocaleLowerCase(),
    )
        ? [value, ...options]
        : options;
    const customQuery = normalizedQuery && !exactMatch ? normalizedQuery : null;
    const items = customQuery && !visibleOptions.some(
        (option) => option.toLocaleLowerCase() === customQuery.toLocaleLowerCase(),
    )
        ? [...visibleOptions, customQuery]
        : visibleOptions;
    return (
        <Combobox
            items={items}
            value={value || null}
            onValueChange={(nextValue) => {
                if (typeof nextValue === "string") onChange(nextValue);
                else if (nextValue === null) onChange("");
            }}
            onInputValueChange={setQuery}
            itemToStringLabel={(item) => item}
            autoHighlight
        >
            <ComboboxInput
                id={id}
                aria-label={label}
                placeholder={placeholder}
                disabled={disabled}
                showClear
                className="w-full"
            />
            <ComboboxContent>
                <ComboboxList>
                    {items.map((option) => (
                        <ComboboxItem key={`${label}-${option}`} value={option}>
                            {customQuery && option === customQuery
                                ? `Use “${customQuery}” as custom ${label.toLowerCase()}`
                                : option}
                        </ComboboxItem>
                    ))}
                    <ComboboxEmpty>No matches. Type a value and choose the custom option.</ComboboxEmpty>
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

export function MakeModelFields({
    manufacturer,
    model,
    onManufacturerChange,
    onModelChange,
    manufacturerError,
    modelError,
    disabled,
}: MakeModelFieldsProps) {
    const id = useId();
    const modelOptions = getVehicleModels(manufacturer);

    return (
        <>
            <div className="space-y-2">
                <Label htmlFor={`${id}-manufacturer`}>Manufacturer</Label>
                <SearchableVehicleField
                    id={`${id}-manufacturer`}
                    label="Manufacturer"
                    value={manufacturer}
                    options={VEHICLE_MANUFACTURERS}
                    placeholder="Search or enter manufacturer"
                    disabled={disabled}
                    onChange={(nextManufacturer) => {
                        if (nextManufacturer !== manufacturer) onModelChange("");
                        onManufacturerChange(nextManufacturer);
                    }}
                />
                {manufacturerError && <p className="text-sm text-destructive">{manufacturerError}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor={`${id}-model`}>Model</Label>
                <SearchableVehicleField
                    id={`${id}-model`}
                    label="Model"
                    value={model}
                    options={modelOptions}
                    placeholder={manufacturer ? "Search or enter model" : "Choose a manufacturer first"}
                    disabled={disabled || !manufacturer}
                    onChange={onModelChange}
                />
                {modelError && <p className="text-sm text-destructive">{modelError}</p>}
            </div>
        </>
    );
}
