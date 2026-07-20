export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ASSISTANT_ADMIN = 'assistant_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ClassificationCode {
  A = 'A',
  M = 'M',
  I = 'I',
  C = 'C',
  R = 'R',
  T = 'T',
}

export const CLASSIFICATION_LABELS: Record<ClassificationCode, string> = {
  [ClassificationCode.A]: 'Agriculture',
  [ClassificationCode.M]: 'Mineral',
  [ClassificationCode.I]: 'Industrial',
  [ClassificationCode.C]: 'Commercial',
  [ClassificationCode.R]: 'Residential',
  [ClassificationCode.T]: 'Timberland',
};

export const BARANGAYS = [
  'Awihao',
  'Bagakay',
  'Bato',
  'Biga',
  'Bulongan',
  'Bunga',
  'Cabitoonan',
  'Calongcalong',
  'Cambang-ug',
  'Camp 8',
  'Canlumampao',
  'Cantabaco',
  'Capitan Claudio',
  'Carmen',
  'Daanglungsod',
  'Don Andres Soriano (Lutopan)',
  'Dumlog',
  'General Climaco (Malubog)',
  'Ibo',
  'Ilihan',
  'Juan Climaco, Sr. (Magdugo)',
  'Landahan',
  'Loay',
  'Luray II',
  'Matab-ang',
  'Media Once',
  'Pangamihan',
  'Poblacion',
  'Poog',
  'Putingbato',
  'Sagay',
  'Sam-ang',
  'Sangi',
  'Santo Niño (Mainggit)',
  'Subayon',
  'Talavera',
  'Tubod',
  'Tungkay',
];
