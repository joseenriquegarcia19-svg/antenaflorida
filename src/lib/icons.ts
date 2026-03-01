import { Music, Mic, Video, Camera, Radio, Cpu, Award, Heart, BookOpen, Briefcase, Coffee, DollarSign, Gamepad2, GraduationCap, Home, Landmark, Leaf, MapPin, Plane, ShoppingBag, Smartphone, Star, Sun, Truck, Umbrella, Zap, Users, Gavel, Building2, Building, ShieldCheck, LayoutGrid, Monitor, Globe } from 'lucide-react';

export const getCategoryIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('musica') || normalized.includes('música')) return Music;
  if (normalized.includes('podcast')) return Mic;
  if (normalized.includes('video')) return Video;
  if (normalized.includes('foto') || normalized.includes('galeria')) return Camera;
  if (normalized.includes('radio') || normalized.includes('vivo')) return Radio;
  if (normalized.includes('tech') || normalized.includes('tecnologia')) return Cpu;
  if (normalized.includes('deporte')) return Award;
  if (normalized.includes('politica')) return Landmark;
  if (normalized.includes('econom')) return DollarSign;
  if (normalized.includes('salud')) return Heart;
  if (normalized.includes('educacion')) return GraduationCap;
  if (normalized.includes('ciencia')) return  Zap;
  if (normalized.includes('arte') || normalized.includes('cultura')) return  BookOpen;
  if (normalized.includes('mundo') || normalized.includes('internacional')) return Globe;
  if (normalized.includes('local') || normalized.includes('nacional')) return MapPin;
  if (normalized.includes('clima') || normalized.includes('tiempo')) return Sun;
  if (normalized.includes('viaje') || normalized.includes('turismo')) return Plane;
  if (normalized.includes('comida') || normalized.includes('gastronomia')) return Coffee;
  if (normalized.includes('negocio')) return Briefcase;
  if (normalized.includes('moda') || normalized.includes('estilo')) return ShoppingBag;
  if (normalized.includes('juego') || normalized.includes('gamer')) return Gamepad2;
  if (normalized.includes('cine') || normalized.includes('pelicula')) return Monitor;
  if (normalized.includes('hogar')) return Home;
  if (normalized.includes('auto')) return Truck;
  if (normalized.includes('ambiente')) return Leaf;
  if (normalized.includes('derecho') || normalized.includes('humano')) return Users;
  if (normalized.includes('sociedad')) return Users;
  if (normalized.includes('judicial')) return Gavel;
  if (normalized.includes('geopolitica')) return Globe;
  if (normalized.includes('diaspora') || normalized.includes('diáspora')) return Plane;
  if (normalized.includes('infraestructura')) return Building2;
  if (normalized.includes('ciudad')) return Building;
  if (normalized.includes('servicio') || normalized.includes('publico')) return Zap;
  if (normalized.includes('seguridad')) return ShieldCheck;
  
  return LayoutGrid; // Default
};