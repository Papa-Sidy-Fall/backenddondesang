export interface DonorDashboardDto {
  profile: {
    id: string;
    nom: string;
    email: string;
    telephone: string;
    groupeSanguin: string;
    dateNaissance: string;
    adresse: string;
    dernierDon: string | null;
    prochainDonPossible: string | null;
    totalDons: number;
    viesSauvees: number;
  };
  historiqueDons: Array<{
    id: string;
    date: string;
    centre: string;
    type: string;
    statut: string;
  }>;
  prochainsRendezVous: Array<{
    id: string;
    date: string;
    heure: string;
    centre: string;
    type: string;
    statut: string;
  }>;
  badges: Array<{
    nom: string;
    icon: string;
    obtenu: boolean;
  }>;
  urgences: Array<{
    id: string;
    hopital: string;
    groupe: string;
    besoin: string;
    distance: string;
    description: string;
    quantite: number;
    priorite: string;
    createdAt: string;
  }>;
  campagnes: Array<{
    id: string;
    titre: string;
    description: string;
    date: string;
    dateFin: string;
    statut: string;
    lieu: string;
  }>;
}
