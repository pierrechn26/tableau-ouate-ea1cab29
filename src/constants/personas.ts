/**
 * Shared persona profiles — single source of truth for all persona naming.
 * Import this wherever you need persona display names, titles, or descriptions.
 */

export interface PersonaProfile {
  code: string;
  displayName: string;
  title: string;
  fullLabel: string; // "Clara — La Novice Imperfections"
  description: string;
}

export const PERSONA_PROFILES: Record<string, PersonaProfile> = {
  P1: { code: "P1", displayName: "Clara", title: "La Novice Imperfections", fullLabel: "Clara — La Novice Imperfections", description: "Nouvelle cliente dont l'enfant de 4-9 ans présente des imperfections cutanées. Elle découvre ce sujet pour la première fois et cherche une solution efficace, rassurante et adaptée à la peau jeune." },
  P2: { code: "P2", displayName: "Nathalie", title: "La Novice Pré-ado", fullLabel: "Nathalie — La Novice Pré-ado", description: "Maman d'un pré-ado de 10-11 ans qui voit apparaître les premiers boutons. Elle veut des soins adaptés à cet âge charnière, ni trop enfantins ni trop agressifs, pour accompagner son enfant avec tact." },
  P3: { code: "P3", displayName: "Amandine", title: "La Novice Atopique", fullLabel: "Amandine — La Novice Atopique", description: "Maman très protectrice dont l'enfant a une peau atopique diagnostiquée. Experte en lecture d'étiquettes, elle ne fait confiance qu'aux produits cliniquement testés, hypoallergéniques et sans parfum." },
  P4: { code: "P4", displayName: "Julie", title: "La Novice Sensible", fullLabel: "Julie — La Novice Sensible", description: "Maman précautionneuse face à la peau sensible et réactive de son enfant. Elle privilégie les formulations minimalistes et douces, prend le temps de comparer avant chaque achat." },
  P5: { code: "P5", displayName: "Stéphanie", title: "La Multi-enfants", fullLabel: "Stéphanie — La Multi-enfants", description: "Maman de plusieurs enfants aux types de peau différents. Elle cherche des routines simples, des produits polyvalents et un bon rapport qualité-prix pour gérer toute la fratrie." },
  P6: { code: "P6", displayName: "Camille", title: "La Novice Découverte", fullLabel: "Camille — La Novice Découverte", description: "Jeune maman enthousiaste qui découvre l'univers des soins pour enfants. Réceptive aux conseils et aux nouveautés, elle apprécie les parcours guidés et les contenus éducatifs." },
  P7: { code: "P7", displayName: "Sandrine", title: "L'Insatisfaite", fullLabel: "Sandrine — L'Insatisfaite", description: "Maman exigeante qui a déjà testé plusieurs marques sans satisfaction. Devenue sceptique, elle a besoin de preuves concrètes d'efficacité et de transparence totale avant de refaire confiance." },
  P8: { code: "P8", displayName: "Virginie", title: "La Fidèle Imperfections", fullLabel: "Virginie — La Fidèle Imperfections", description: "Cliente fidèle de Ouate qui revient régulièrement pour cibler les imperfections de son enfant. Elle fait confiance à la marque et est ouverte aux recommandations complémentaires personnalisées." },
  P9: { code: "P9", displayName: "Marine", title: "La Fidèle Exploratrice", fullLabel: "Marine — La Fidèle Exploratrice", description: "Cliente fidèle et curieuse qui aime explorer les nouveautés Ouate. Ambassadrice naturelle, elle partage son expérience et recherche l'innovation et les éditions limitées." },
};

/**
 * Get the full label for a persona code. Falls back to the code itself.
 */
export function getPersonaLabel(code: string): string {
  return PERSONA_PROFILES[code]?.fullLabel ?? code;
}

/**
 * Get just the display name (first name) for a persona code.
 */
export function getPersonaDisplayName(code: string): string {
  return PERSONA_PROFILES[code]?.displayName ?? code;
}

/**
 * Get a short badge label: "Clara (P1)"
 */
export function getPersonaBadgeLabel(code: string): string {
  const profile = PERSONA_PROFILES[code];
  return profile ? `${profile.displayName}` : code;
}
