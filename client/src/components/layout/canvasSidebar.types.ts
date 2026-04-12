export type CanvasNavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
};

export type CanvasNavSection = {
  type: "section";
  label: string;
  items: CanvasNavItem[];
};

export type CanvasSidebarEntry = CanvasNavItem | CanvasNavSection;
