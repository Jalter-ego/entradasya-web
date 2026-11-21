/**
 * Mismas listas que services/events/src/catalog.ts. Si agregas un valor allá, agrégalo aquí
 * con su nombre visible.
 */
export const CATEGORY_LABEL: Record<string, string> = {
  concierto: 'Conciertos',
  electronica: 'Electrónica',
  teatro: 'Teatro',
  festival: 'Festivales',
  deportes: 'Deportes',
  fiesta: 'Fiestas',
  capacitacion: 'Capacitación',
  otros: 'Otros',
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL);

export const CITIES = [
  'La Paz',
  'El Alto',
  'Santa Cruz de la Sierra',
  'Cochabamba',
  'Sucre',
  'Oruro',
  'Potosí',
  'Tarija',
  'Trinidad',
  'Cobija',
];

export const categoryLabel = (value: string) => CATEGORY_LABEL[value] ?? value;
