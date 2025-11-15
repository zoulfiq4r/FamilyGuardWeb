import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardLayout } from "./DashboardLayout";

const mockDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  doc: (...args: Parameters<typeof mockDoc>) => mockDoc(...args),
  getDoc: (...args: Parameters<typeof mockGetDoc>) => mockGetDoc(...args),
}));

jest.mock("../config/firebase", () => ({
  db: { mocked: true },
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockImplementation((_db, _collection, id) => ({ id }));
  });

  it("renders navigation and displays child header when selected", async () => {
    const onTabChange = jest.fn();
    const onChildChange = jest.fn();
    const user = userEvent;

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ name: "Sasha" }),
    });

    render(
      <DashboardLayout
        activeTab="dashboard"
        onTabChange={onTabChange}
        selectedChild="child-1"
        onChildChange={onChildChange}
      >
        <div>content</div>
      </DashboardLayout>
    );

    await waitFor(() => expect(screen.getByText("Sasha")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /Location/i }));
    expect(onTabChange).toHaveBeenCalledWith("location");

    await user.click(screen.getByRole("button", { name: /Switch Child/i }));
    expect(onChildChange).toHaveBeenCalledWith(null);
  });

  it("allows collapsing the sidebar when no child is selected", async () => {
    const onTabChange = jest.fn();
    const user = userEvent;
    mockGetDoc.mockResolvedValue({ exists: () => false });

    render(
      <DashboardLayout
        activeTab="pairing"
        onTabChange={onTabChange}
        selectedChild={null}
        onChildChange={jest.fn()}
      >
        <div>content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("FamilyGuard")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Collapse sidebar/i }));
    expect(screen.queryByText("FamilyGuard")).not.toBeInTheDocument();
  });

  it("falls back to a generic child label when Firestore errors", async () => {
    const onChildChange = jest.fn();
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetDoc.mockRejectedValueOnce(new Error("offline"));

    render(
      <DashboardLayout
        activeTab="dashboard"
        onTabChange={jest.fn()}
        selectedChild="child-offline"
        onChildChange={onChildChange}
      >
        <div>content</div>
      </DashboardLayout>
    );

    await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());
    errorSpy.mockRestore();
  });

  it("keeps the default label when the child document does not exist", async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });

    render(
      <DashboardLayout
        activeTab="dashboard"
        onTabChange={jest.fn()}
        selectedChild="child-missing"
        onChildChange={jest.fn()}
      >
        <div>content</div>
      </DashboardLayout>
    );

    await waitFor(() => expect(mockGetDoc).toHaveBeenCalled());
  });

  it("uses the fallback label when the child document omits a name", async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({}),
    });

    render(
      <DashboardLayout
        activeTab="dashboard"
        onTabChange={jest.fn()}
        selectedChild="child-empty"
        onChildChange={jest.fn()}
      >
        <div>content</div>
      </DashboardLayout>
    );

    await waitFor(() => expect(screen.getByText("Child")).toBeInTheDocument());
  });
});
