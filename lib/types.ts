export type AppRole = "root_admin" | "course_admin" | "trainee";

export type NavItem = {
  title: string;
  href: string;
  icon:
    | "dashboard"
    | "courses"
    | "simulation"
    | "assessment"
    | "profile"
    | "lab"
    | "builder"
    | "control";
  allowedRoles?: AppRole[];
  children?: Array<Omit<NavItem, "children" | "icon">>;
};
