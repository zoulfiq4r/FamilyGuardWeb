import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { LiveLocationMap } from "./LiveLocationMap";

const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: (...args: Parameters<typeof mockCollection>) => mockCollection(...args),
  doc: (...args: Parameters<typeof mockDoc>) => mockDoc(...args),
  onSnapshot: (...args: Parameters<typeof mockOnSnapshot>) => mockOnSnapshot(...args),
}));

jest.mock("../config/firebase", () => ({
  db: { mocked: true },
}));

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  Polyline: () => <div data-testid="polyline" />,
}));

jest.mock("leaflet", () => {
  function DefaultIcon() {}
  DefaultIcon.prototype = { _getIconUrl: () => undefined };
  DefaultIcon.mergeOptions = jest.fn();

  return {
    Icon: { Default: DefaultIcon },
    default: { Icon: { Default: DefaultIcon } },
  };
});

describe("LiveLocationMap component", () => {
  const handlers: Array<{ refPath: string; onNext: (snapshot: any) => void; onError: (error: Error) => void }> = [];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    handlers.length = 0;
    mockCollection.mockImplementation((_db, ...segments: string[]) => ({
      path: segments.join("/"),
    }));
    mockDoc.mockImplementation((_db, ...segments: string[]) => ({
      path: segments.join("/"),
    }));
    mockOnSnapshot.mockImplementation((ref, onNext, onError) => {
      const refPath = typeof ref === "string" ? ref : ref?.path ?? "unknown";
      handlers.push({ refPath, onNext, onError });
      return jest.fn();
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the developer instructions when no locations exist yet", async () => {
    render(<LiveLocationMap childId="child-1" childName="Avery" />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(await screen.findByText(/No location data available yet/i)).toBeInTheDocument();
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });

  it("renders live details once Firestore sends a point", async () => {
    render(<LiveLocationMap childId="child-7" childName="Sky" />);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(handlers.length).toBe(2);

    const subcollectionHandler = handlers.find((handler) =>
      handler.refPath.includes("locations")
    )!;
    const docHandler = handlers.find((handler) =>
      handler.refPath.endsWith("child-7")
    )!;

    act(() => {
      subcollectionHandler.onNext({
        docs: [
          {
            id: "loc-1",
            data: () => ({
              latitude: 37.7749,
              longitude: -122.4194,
              timestamp: new Date("2024-01-01T12:00:00Z"),
              accuracy: 5,
              speed: 1.2,
            }),
          },
        ],
      });

      docHandler.onNext({
        exists: () => true,
        data: () => ({
          currentLocation: {
            latitude: 37.775,
            longitude: -122.4195,
            timestamp: new Date("2024-01-01T12:05:00Z"),
            accuracy: 3,
            speed: 1.8,
            heading: 180,
            altitude: 15,
            batteryLevel: 0.58,
            provider: "gps",
            source: "phone",
            providerAccuracy: 2,
            isMock: true,
          },
        }),
      });
    });

    expect(await screen.findByText(/Sky's Live Location/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinates:/i)).toHaveTextContent("37.775000");
    expect(screen.getByText(/Battery/i).parentElement).toHaveTextContent("58%");
  });

  it("handles empty child ids, dedupes history, and processes listener errors", async () => {
    render(<LiveLocationMap childId="" childName="Nobody" />);

    act(() => {
      jest.advanceTimersByTime(1600);
    });

    expect(await screen.findByText(/No location data available yet/i)).toBeInTheDocument();
    expect(mockOnSnapshot).not.toHaveBeenCalled();

    jest.clearAllMocks();
    handlers.length = 0;

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<LiveLocationMap childId="child-dup" childName="Riley" />);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(handlers.length).toBe(2);

    const subcollectionHandler = handlers.find((handler) =>
      handler.refPath.includes("child-dup/locations")
    )!;
    const docHandler = handlers.find((handler) =>
      handler.refPath.endsWith("child-dup")
    )!;

    act(() => {
      docHandler.onNext({
        exists: () => false,
      });
      docHandler.onNext({
        exists: () => true,
        data: () => ({}),
      });
      docHandler.onNext({
        exists: () => true,
        data: () => ({
          currentLocation: {
            latitude: undefined,
            longitude: undefined,
          },
        }),
      });
    });

    act(() => {
      subcollectionHandler.onNext({
        docs: [
          {
            id: "loc-1",
            data: () => ({
              latitude: 10,
              longitude: 10,
              timestamp: new Date("2024-01-01T10:00:00Z"),
              accuracy: 10,
            }),
          },
          {
            id: "loc-1",
            data: () => ({
              latitude: 10,
              longitude: 10,
              timestamp: new Date("2024-01-01T10:00:00Z"),
              accuracy: 10,
            }),
          },
        ],
      });
    });

    expect(await screen.findByText(/Riley's Live Location/i)).toBeInTheDocument();

    act(() => {
      subcollectionHandler.onError(new Error("network down"));
      docHandler.onError(new Error("doc error"));
    });

    errorSpy.mockRestore();
  });
});
