export interface HospitalDashboardDto {
  hospitalName: string;
  summary: {
    totalUnits: number;
    appointmentsToday: number;
    criticalGroups: number;
    activeDonors: number;
  };
  stocks: Array<{
    groupeSanguin: string;
    quantite: number;
    seuil: number;
    statut: "critique" | "faible" | "normal";
  }>;
  rendezvous: Array<{
    id: string;
    donneur: string;
    telephone: string;
    groupeSanguin: string;
    date: string;
    heure: string;
    statut: "en-attente" | "confirme" | "termine" | "annule";
  }>;
  urgences: Array<{
    id: string;
    titre: string;
    description: string;
    niveauLabel: string;
    niveauColor: "red" | "yellow" | "green";
    createdAtLabel: string;
    notifiedDonors: number;
    positiveResponses: number;
    donationsCompleted: number;
  }>;
}
