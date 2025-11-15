import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import App from "./App";
import { onAuthStateChanged } from "firebase/auth";

jest.mock("./config/firebase", () => ({
  auth: {},
}));

jest.mock("./components/AuthScreen", () => ({
  AuthScreen: () => <div data-testid="auth-screen">Auth Screen</div>,
}));

type DashboardLayoutMockProps = {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedChild: string | null;
  onChildChange: (childId: string | null) => void;
};

let dashboardLayoutProps: DashboardLayoutMockProps | null = null;

jest.mock("./components/DashboardLayout", () => ({
  DashboardLayout: (props: DashboardLayoutMockProps) => {
    dashboardLayoutProps = props;
    return <div data-testid="dashboard-layout">{props.children}</div>;
  },
}));

jest.mock("./components/DashboardHome", () => ({
  DashboardHome: ({ childId }: { childId: string }) => (
    <div data-testid="dashboard-home">Dashboard for {childId}</div>
  ),
}));

jest.mock("./components/LocationTracking", () => ({
  LocationTracking: () => <div data-testid="location-tracking">Location</div>,
}));

jest.mock("./components/AppManagement", () => ({
  AppManagement: () => <div data-testid="app-management">App Mgmt</div>,
}));

jest.mock("./components/ReportsAnalytics", () => ({
  ReportsAnalytics: () => <div data-testid="reports-analytics">Reports</div>,
}));

jest.mock("./components/SettingsPage", () => ({
  SettingsPage: () => <div data-testid="settings-page">Settings</div>,
}));

jest.mock("./components/PairingCodeGenerator", () => ({
  PairingCodeGenerator: ({ userId }: { userId: string }) => (
    <div data-testid="pairing-code-generator">Pairing for {userId}</div>
  ),
}));

type ChildSelectorMockProps = {
  parentId: string;
  onSelectChild: (childId: string) => void;
  onCreateNew?: () => void;
};

let childSelectorProps: ChildSelectorMockProps | null = null;

jest.mock("./components/ChildSelector", () => ({
  ChildSelector: (props: any) => {
    childSelectorProps = props;
    return <div data-testid="child-selector">Child Selector</div>;
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(),
}));

const mockOnAuthStateChanged = onAuthStateChanged as jest.Mock;

describe("App", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    childSelectorProps = null;
    dashboardLayoutProps = null;
  });

  it("shows loading state while waiting for auth resolution", () => {
    let authCallback: ((user: unknown) => void) | undefined;

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      authCallback = callback;
      return jest.fn();
    });

    render(<App />);

    expect(screen.getByText(/Loading FamilyGuard/i)).toBeInTheDocument();

    act(() => {
      authCallback?.(null);
    });
  });

  it("renders AuthScreen when no user is authenticated", () => {
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(null);
      return jest.fn();
    });

    render(<App />);

    expect(screen.getByTestId("auth-screen")).toBeInTheDocument();
  });

  it("shows ChildSelector when a user is authenticated but no child is selected", () => {
    const mockUser = { uid: "user-1" };

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(<App />);

    expect(screen.getByTestId("child-selector")).toBeInTheDocument();
    expect(childSelectorProps?.parentId).toBe("user-1");
  });

  it("renders dashboard content once a child is selected", async () => {
    const mockUser = { uid: "user-123" };

    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(<App />);

    expect(screen.getByTestId("child-selector")).toBeInTheDocument();
    expect(childSelectorProps).not.toBeNull();
    const selectChild = childSelectorProps!.onSelectChild;

    await act(async () => {
      selectChild("child-456");
    });

    expect(await screen.findByTestId("dashboard-home")).toHaveTextContent("child-456");
  });

  it("routes the user to pairing when ChildSelector requests it", async () => {
    const mockUser = { uid: "user-abc" };
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(<App />);

    expect(childSelectorProps).not.toBeNull();
    act(() => {
      childSelectorProps?.onCreateNew?.();
    });

    expect(screen.getByTestId("pairing-code-generator")).toHaveTextContent("Pairing for user-abc");
  });

  it("renders other tab panels when DashboardLayout requests them", async () => {
    const mockUser = { uid: "user-tabs" };
    mockOnAuthStateChanged.mockImplementation((_, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    render(<App />);
    await act(async () => {
      childSelectorProps?.onSelectChild("child-tabs");
    });
    await screen.findByTestId("dashboard-home");

    await act(async () => {
      dashboardLayoutProps?.onTabChange("location");
    });
    expect(await screen.findByTestId("location-tracking")).toBeInTheDocument();

    await act(async () => {
      dashboardLayoutProps?.onTabChange("apps");
    });
    expect(await screen.findByTestId("app-management")).toBeInTheDocument();

    await act(async () => {
      dashboardLayoutProps?.onTabChange("reports");
    });
    expect(await screen.findByTestId("reports-analytics")).toBeInTheDocument();

    await act(async () => {
      dashboardLayoutProps?.onTabChange("settings");
    });
    expect(await screen.findByTestId("settings-page")).toBeInTheDocument();
  });
});
