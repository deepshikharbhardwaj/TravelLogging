export interface Logistics {
  hotelName: string;
  hotelCost: number;
  transportMode: string;
  transportCost: number;
}

export interface MealInfo {
  name: string;
  cost: number;
  restaurant: string;
}

export interface FoodLogistics {
  breakfast: MealInfo;
  lunch: MealInfo;
  dinner: MealInfo;
}

export interface BlogSection {
  id: string;
  paragraphEn: string;
  paragraphHi: string;
  topic: string; 
  image?: string; 
}

export interface DayLog {
  id: string;
  dayNumber: number;
  rawTranscript: string;
  sections: BlogSection[];
  summary: string;
  logistics: Logistics;
  foodLogistics: FoodLogistics;
  isCompleted: boolean;
  date: string;
}

export interface Trip {
  id: string;
  title: string;
  location: string;
  coverImage: string;
  days: DayLog[];
  isPublic: boolean;
  startDate: string;
  status: 'active' | 'completed';
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export type ViewState = 'LANDING' | 'VAULT' | 'JOURNALING' | 'AUTH';
export type Language = 'en' | 'hi';