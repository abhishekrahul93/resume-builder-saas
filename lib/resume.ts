export type ResumeState = {
  name: string;
  role: string;
  targetJob: string;
  location: string;
  email: string;
  phone: string;
  links: string;
  summary: string;
  experienceTitle: string;
  experienceDates: string;
  experience: string;
  education: string;
  projects: string;
  certifications: string;
  skills: string;
  versionName?: string;
  versionLanguage?: string;
  versionFormat?: string;
  exportFileName?: string;
};

export const appliedResumeStorageKey = "careerforge.appliedResume";
export const savedVersionsStorageKey = "careerforge.savedVersions";

export const initialResume: ResumeState = {
  name: "Abhishek Rahul",
  role: "Data Analyst",
  targetJob:
    "Data Analyst role focused on dashboarding, SQL reporting, KPI analysis, and business stakeholder communication.",
  location: "Berlin, Germany",
  email: "abhishek@example.com",
  phone: "+49 152 0000 0000",
  links: "linkedin.com/in/abhishek | github.com/abhishek",
  summary:
    "I am a data analyst with experience in dashboards, SQL, Excel, Power BI, and business reporting. I like solving problems and finding insights.",
  experienceTitle: "Data Analytics Intern, Retail Insights Lab",
  experienceDates: "Jan 2025 - Dec 2025",
  experience: "built sales dashboard in Power BI\ncleaned customer data using SQL\nprepared weekly reports for management\nimproved reporting speed",
  education: "B.Sc. Business Analytics, Berlin Applied Sciences University\nRelevant coursework: Statistics, SQL, Data Visualization",
  projects: "Product Analytics Dashboard - Built an interactive Power BI dashboard to track revenue, conversion, and retention KPIs.",
  certifications: "Google Data Analytics Certificate",
  skills: "SQL, Power BI, Excel, Python, Tableau, Data Cleaning, Dashboard Design, KPI Reporting"
};

export function listFromText(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
