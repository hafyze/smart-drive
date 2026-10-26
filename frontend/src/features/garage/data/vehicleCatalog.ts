/**
 * Curated starter catalog for common Malaysia-market vehicles.
 * Keep this local and versioned so vehicle entry works without a third-party API.
 * Custom makes and models remain available through the vehicle form.
 */
export const VEHICLE_CATALOG_VERSION = 1;

export const VEHICLE_CATALOG: Record<string, string[]> = {
    Audi: ["A3", "A4", "A5", "A6", "Q3", "Q5", "Q7", "e-tron"],
    BMW: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X7", "i4", "iX"],
    BYD: ["Atto 3", "Dolphin", "Seal", "Sealion 7"],
    Chery: ["Omoda 5", "Tiggo 7 Pro", "Tiggo 8 Pro"],
    Ford: ["EcoSport", "Fiesta", "Focus", "Everest", "Ranger"],
    Honda: ["Accord", "BR-V", "City", "City Hatchback", "Civic", "CR-V", "HR-V", "Jazz", "Odyssey", "WR-V"],
    Hyundai: ["Elantra", "Kona", "Santa Fe", "Staria", "Tucson"],
    Isuzu: ["D-Max", "MU-X"],
    Jaecoo: ["J7"],
    Kia: ["Carnival", "Cerato", "Picanto", "Sorento", "Sportage"],
    Lexus: ["ES", "IS", "LBX", "NX", "RX", "UX"],
    Mazda: ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-30", "CX-5", "CX-8", "BT-50"],
    "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS"],
    Mitsubishi: ["ASX", "Attrage", "Outlander", "Triton", "Xpander"],
    Nissan: ["Almera", "Grand Livina", "Navara", "Serena", "Sylphy", "Teana", "X-Trail"],
    Perodua: ["Alza", "Aruz", "Ativa", "Axia", "Bezza", "Kancil", "Kelisa", "Kenari", "Kembara", "Myvi", "Viva"],
    Proton: ["Exora", "Inspira", "Iriz", "Persona", "Preve", "Saga", "Satria Neo", "Suprima S", "X50", "X70", "X90"],
    Subaru: ["BRZ", "Forester", "Impreza", "XV", "WRX"],
    Suzuki: ["Jimny", "Swift", "Vitara"],
    Toyota: ["Alphard", "Avanza", "Camry", "Corolla", "Corolla Cross", "Fortuner", "Harrier", "Hilux", "Innova", "Rush", "Vios", "Yaris"],
    Volkswagen: ["Golf", "Passat", "Tiguan", "Touareg"],
};

export const VEHICLE_MANUFACTURERS = Object.keys(VEHICLE_CATALOG).sort((a, b) => a.localeCompare(b));

export function getVehicleModels(manufacturer: string): string[] {
    const catalogManufacturer = VEHICLE_MANUFACTURERS.find(
        (candidate) => candidate.toLocaleLowerCase() === manufacturer.trim().toLocaleLowerCase(),
    );
    return catalogManufacturer ? VEHICLE_CATALOG[catalogManufacturer] : [];
}
