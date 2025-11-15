import { render, screen, waitFor } from "@testing-library/react";
import { LocationTracking } from "./LocationTracking";

const mockDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock("firebase/firestore", () => ({
  doc: (...args: Parameters<typeof mockDoc>) => mockDoc(...args),
  getDoc: (...args: Parameters<typeof mockGetDoc>) => mockGetDoc(...args),
}));

jest.mock("../config/firebase", () => ({
  db: { mocked: true },
}));

jest.mock("./LiveLocationMap", () => ({
  LiveLocationMap: ({ childId, childName }: { childId: string; childName: string }) => (
    <div data-testid="live-location-map">
      map-child:{childId}-name:{childName}
    </div>
  ),
}));

describe("LocationTracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders default heading and passes props to LiveLocationMap", () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });

    render(<LocationTracking childId="child-123" />);

    expect(screen.getByRole("heading", { name: /Location Tracking/i })).toBeInTheDocument();
    expect(screen.getByText(/Real-time location monitoring for Child/i)).toBeInTheDocument();
    expect(screen.getByTestId("live-location-map")).toHaveTextContent(
      "map-child:child-123-name:Child"
    );
  });

  it("updates the label once Firestore returns a name", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ name: "Sasha" }),
    });

    render(<LocationTracking childId="child-999" />);

    await waitFor(() =>
      expect(screen.getByText(/Real-time location monitoring for Sasha/i)).toBeInTheDocument()
    );
    expect(mockDoc).toHaveBeenCalledWith({ mocked: true }, "children", "child-999");
    expect(screen.getByTestId("live-location-map")).toHaveTextContent(
      "map-child:child-999-name:Sasha"
    );
  });

  it("logs and keeps the default name when Firestore rejects", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockGetDoc.mockRejectedValueOnce(new Error("firestore down"));

    render(<LocationTracking childId="child-err" />);

    await waitFor(() =>
      expect(screen.getByText(/Real-time location monitoring for Child/i)).toBeInTheDocument()
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("skips Firestore lookups when no child id is provided", () => {
    render(<LocationTracking childId="" />);
    expect(screen.getByText(/Real-time location monitoring for Child/i)).toBeInTheDocument();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it("falls back to 'Child' when Firestore omits a name", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({}),
    });

    render(<LocationTracking childId="child-no-name" />);

    await waitFor(() =>
      expect(screen.getByText(/Real-time location monitoring for Child/i)).toBeInTheDocument()
    );
  });
});
