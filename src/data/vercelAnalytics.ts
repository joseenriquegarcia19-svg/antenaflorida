export interface VercelAnalyticsData {
  overview: {
    views: number;
    unique_visitors: number;
    countries: number;
  };
  topPages: {
    path: string;
    views: number;
    unique_visitors: number;
  }[];
  byCountry: {
    country: string;
    views: number;
    unique_visitors: number;
  }[];
  demographics: {
    device: { key: string; views: number; unique_visitors: number }[];
    browser: { key: string; views: number; unique_visitors: number }[];
    os: { key: string; views: number; unique_visitors: number }[];
    referrer: { key: string; views: number; unique_visitors: number }[];
  };
}

export const vercelAnalyticsSnapshot: VercelAnalyticsData = {
  overview: {
    views: 8464, // Sum of views from all known countries in CSV
    unique_visitors: 966, // Sum of visitors from all known countries in CSV
    countries: 22,
  },
  topPages: [
    { path: "/", unique_visitors: 730, views: 3211 },
    { path: "/admin", unique_visitors: 170, views: 591 },
    { path: "/login", unique_visitors: 87, views: 144 },
    { path: "/admin/news", unique_visitors: 86, views: 272 },
    { path: "/player", unique_visitors: 85, views: 139 },
    { path: "/news", unique_visitors: 78, views: 287 },
    { path: "/admin/users", unique_visitors: 66, views: 159 },
    { path: "/schedule", unique_visitors: 65, views: 182 },
    { path: "/noticias", unique_visitors: 64, views: 134 },
    { path: "/videos", unique_visitors: 55, views: 107 },
    { path: "/reels", unique_visitors: 54, views: 122 },
    { path: "/team", unique_visitors: 54, views: 152 },
    { path: "/admin/stations", unique_visitors: 50, views: 131 },
    { path: "/programas", unique_visitors: 44, views: 83 },
    { path: "/admin/settings", unique_visitors: 37, views: 69 },
    { path: "/admin/analytics", unique_visitors: 36, views: 73 },
    { path: "/admin/team", unique_visitors: 35, views: 77 },
    { path: "/chat", unique_visitors: 34, views: 68 },
    { path: "/admin/promotions", unique_visitors: 33, views: 94 },
    { path: "/horario", unique_visitors: 32, views: 43 },
  ],
  byCountry: [
    { country: "US", unique_visitors: 849, views: 8167 },
    { country: "CU", unique_visitors: 42, views: 153 },
    { country: "IE", unique_visitors: 14, views: 19 },
    { country: "SE", unique_visitors: 13, views: 15 },
    { country: "CA", unique_visitors: 12, views: 17 },
    { country: "AR", unique_visitors: 7, views: 49 },
    { country: "AU", unique_visitors: 5, views: 5 },
    { country: "FR", unique_visitors: 4, views: 10 },
    { country: "CO", unique_visitors: 3, views: 5 },
    { country: "DE", unique_visitors: 2, views: 4 },
    { country: "ES", unique_visitors: 2, views: 5 },
    { country: "MX", unique_visitors: 2, views: 2 },
    { country: "NL", unique_visitors: 2, views: 4 },
    { country: "BR", unique_visitors: 1, views: 1 },
    { country: "GB", unique_visitors: 1, views: 1 },
    { country: "IN", unique_visitors: 1, views: 1 },
    { country: "IT", unique_visitors: 1, views: 1 },
    { country: "PA", unique_visitors: 1, views: 1 },
    { country: "PR", unique_visitors: 1, views: 1 },
    { country: "SG", unique_visitors: 1, views: 1 },
    { country: "TR", unique_visitors: 1, views: 1 },
    { country: "VE", unique_visitors: 1, views: 1 },
  ],
  demographics: {
    device: [
      { key: "Mobile", unique_visitors: 558, views: 3593 },
      { key: "Desktop", unique_visitors: 395, views: 4829 },
      { key: "Tablet", unique_visitors: 10, views: 39 },
    ],
    browser: [
      { key: "Chrome", unique_visitors: 333, views: 2166 },
      { key: "Mobile Safari", unique_visitors: 317, views: 2915 },
      { key: "Chrome Mobile", unique_visitors: 154, views: 527 },
      { key: "Safari", unique_visitors: 57, views: 2679 },
      { key: "Facebook", unique_visitors: 56, views: 83 },
      { key: "Microsoft Edge", unique_visitors: 5, views: 5 },
    ],
    os: [
      { key: "iOS", unique_visitors: 358, views: 2999 },
      { key: "Android", unique_visitors: 210, views: 633 },
      { key: "Windows", unique_visitors: 179, views: 649 },
      { key: "Mac", unique_visitors: 149, views: 3374 },
      { key: "Linux", unique_visitors: 67, views: 806 },
    ],
    referrer: [
      { key: "google.com", unique_visitors: 77, views: 174 },
      { key: "facebook.com", unique_visitors: 76, views: 85 },
      { key: "m.facebook.com", unique_visitors: 66, views: 94 },
      { key: "vercel.com", unique_visitors: 4, views: 4 },
      { key: "instagram.com", unique_visitors: 3, views: 3 },
    ],
  },
};
