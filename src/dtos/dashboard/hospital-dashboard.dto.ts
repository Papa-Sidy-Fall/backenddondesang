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
    donorUserId: string;
    donneur: string;
    email: string;
    cni: string;
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
  donneurs: Array<{
    id: string;
    nom: string;
    email: string;
    cni: string;
    telephone: string;
    groupeSanguin: string;
    ville: string;
    quartier: string;
    dateNaissance: string;
    inscritLe: string;
  }>;
  campagnes: Array<{
    id: string;
    titre: string;
    description: string;
    dateDebut: string;
    dateFin: string;
    lieu: string;
    statut: "active" | "terminee" | "planifiee";
  }>;
}
