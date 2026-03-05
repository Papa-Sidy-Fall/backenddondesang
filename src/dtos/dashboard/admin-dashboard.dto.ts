export interface AdminDashboardDto {
  statistiques: {
    totalDonors: number;
    donationsThisMonth: number;
    partnerHospitals: number;
    activeCampaigns: number;
  };
  evolutionMensuelle: Array<{
    mois: string;
    dons: number;
    max: number;
  }>;
  repartitionGroupes: Array<{
    groupe: string;
    pourcentage: number;
    couleur: string;
  }>;
  regions: Array<{
    region: string;
    donneurs: number;
    dons: number;
    centres: number;
  }>;
  campagnes: Array<{
    id: string;
    titre: string;
    description: string;
    dateDebut: string;
    dateFin: string;
    objectif: number;
    collecte: number;
    statut: "active" | "terminee" | "planifiee";
    lieu: string;
  }>;
  utilisateurs: {
    donneursActifs: number;
    hopitauxPartenaires: number;
    administrateurs: number;
    derniersDonneurs: Array<{
      id: string;
      nom: string;
      email: string;
      groupe: string;
      date: string;
      ville: string;
    }>;
  };
}
