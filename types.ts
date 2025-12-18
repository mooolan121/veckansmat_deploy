
export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  dishName: string;
  ingredients: Ingredient[];
  steps: string[];
  cookingTime: string;
  difficulty: 'Enkel' | 'Medel' | 'Avancerad';
}

export interface MealItem {
  id: string;
  name: string;
}

export interface WeeklyPlan {
  mon: MealItem[];
  tue: MealItem[];
  wed: MealItem[];
  thu: MealItem[];
  fri: MealItem[];
  sat: MealItem[];
  sun: MealItem[];
}

export type DayId = keyof WeeklyPlan;

export const DAYS: { id: DayId; label: string; dayIndex: number }[] = [
  { id: 'mon', label: 'Måndag', dayIndex: 1 },
  { id: 'tue', label: 'Tisdag', dayIndex: 2 },
  { id: 'wed', label: 'Onsdag', dayIndex: 3 },
  { id: 'thu', label: 'Torsdag', dayIndex: 4 },
  { id: 'fri', label: 'Fredag', dayIndex: 5 },
  { id: 'sat', label: 'Lördag', dayIndex: 6 },
  { id: 'sun', label: 'Söndag', dayIndex: 0 }
];
