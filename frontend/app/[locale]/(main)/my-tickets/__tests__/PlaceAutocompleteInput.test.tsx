import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

type ScriptMode = "load" | "error";

type FakePrediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
    main_text_matched_substrings?: Array<{ offset: number; length: number }>;
  };
};

type LoadComponentOptions = {
  apiKey?: string;
  scriptMode?: ScriptMode;
  predictionsByInput?: Record<string, FakePrediction[]>;
  withGoogleService?: boolean;
};

const TEST_LABELS = {
  placeholder: "예) 올림픽공원 체조경기장",
  loadingLabel: "장소 자동완성을 불러오는 중입니다",
  readyLabel: "자동완성으로 장소를 검색할 수 있습니다",
  unavailableLabel: "자동완성 사용 불가: 장소명을 직접 입력하세요",
  errorLabel: "자동완성을 불러오지 못했습니다. 장소명을 직접 입력하세요",
  selectedLabel: "장소가 자동완성으로 선택되었습니다",
  emptyLabel: "검색 결과가 없습니다. 장소명을 직접 입력하세요",
};

const baseProps = {
  id: "ticket-venue",
  apiKey: "test-key",
  placeholder: TEST_LABELS.placeholder,
  loadingLabel: TEST_LABELS.loadingLabel,
  readyLabel: TEST_LABELS.readyLabel,
  unavailableLabel: TEST_LABELS.unavailableLabel,
  errorLabel: TEST_LABELS.errorLabel,
  selectedLabel: TEST_LABELS.selectedLabel,
  emptyLabel: TEST_LABELS.emptyLabel,
};

const loadComponent = async ({
  apiKey,
  scriptMode = "load",
  predictionsByInput = {},
  withGoogleService = false,
}: LoadComponentOptions) => {
  vi.resetModules();

  if (apiKey) {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", apiKey);
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = apiKey;
  } else {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
  }

  vi.doMock("next-intl", () => ({
    useLocale: () => "ko",
  }));

  vi.doMock("next/script", async () => {
    const React = await import("react");

    return {
      default: ({
        onReady,
        onError,
      }: {
        onReady?: () => void;
        onError?: () => void;
      }) => {
        React.useEffect(() => {
          if (scriptMode === "load") {
            onReady?.();
            return;
          }

          onError?.();
        }, [onError, onReady]);

        return React.createElement("div", { "data-testid": "google-maps-script" });
      },
    };
  });

  if (withGoogleService) {
    function FakeAutocompleteService() {
      return {
        getPlacePredictions: (
          request: { input: string },
          callback: (predictions: FakePrediction[] | null, status: string) => void,
        ) => {
          const predictions = predictionsByInput[request.input] ?? [];
          callback(predictions, predictions.length > 0 ? "OK" : "ZERO_RESULTS");
        },
      };
    }

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            AutocompleteService: vi.fn(FakeAutocompleteService),
          },
        },
      },
    });
  } else {
    Reflect.deleteProperty(window, "google");
  }

  const module = await import("../PlaceAutocompleteInput");

  return {
    PlaceAutocompleteInput: module.PlaceAutocompleteInput,
  };
};

describe("PlaceAutocompleteInput", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unmock("next-intl");
    vi.unmock("next/script");
    vi.unstubAllEnvs();
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
    Reflect.deleteProperty(window, "google");
  });

  it("API key가 없으면 unavailable fallback을 표시한다", async () => {
    const { PlaceAutocompleteInput } = await loadComponent({});

    render(
      <PlaceAutocompleteInput
        {...baseProps}
        apiKey={undefined}
        value=""
        onChange={() => undefined}
        onPlaceSelect={() => undefined}
      />,
    );

    expect(screen.queryByTestId("google-maps-script")).not.toBeInTheDocument();
    expect(screen.getByText(TEST_LABELS.unavailableLabel)).toBeInTheDocument();
  });

  it("입력하면 PERFO가 직접 렌더링한 자동완성 목록을 표시한다", async () => {
    const user = userEvent.setup();
    const predictionsByInput = {
      올림: [
        {
          description: "올림픽공원 체조경기장, 서울 송파구",
          place_id: "place-1",
          structured_formatting: {
            main_text: "올림픽공원 체조경기장",
            secondary_text: "서울 송파구",
            main_text_matched_substrings: [{ offset: 0, length: 2 }],
          },
        },
      ],
    };
    const { PlaceAutocompleteInput } = await loadComponent({
      scriptMode: "load",
      withGoogleService: true,
      predictionsByInput,
    });

    const Wrapper = () => {
      const [value, setValue] = useState("");

      return (
        <PlaceAutocompleteInput
          {...baseProps}
          value={value}
          onChange={setValue}
          onPlaceSelect={() => undefined}
        />
      );
    };

    render(<Wrapper />);

    const input = screen.getByRole("combobox");
    await user.type(input, "올림");

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: /올림픽공원 체조경기장/ }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByText("서울 송파구")).toBeInTheDocument();
  });

  it("unmount 후 remount 되어도 기존 window.google로 다시 초기화한다", async () => {
    const user = userEvent.setup();
    const predictionsByInput = {
      올림: [
        {
          description: "올림픽공원 체조경기장, 서울 송파구",
          place_id: "place-1",
          structured_formatting: {
            main_text: "올림픽공원 체조경기장",
            secondary_text: "서울 송파구",
          },
        },
      ],
    };
    const { PlaceAutocompleteInput } = await loadComponent({
      scriptMode: "load",
      withGoogleService: true,
      predictionsByInput,
    });

    const Wrapper = () => {
      const [value, setValue] = useState("");

      return (
        <PlaceAutocompleteInput
          {...baseProps}
          value={value}
          onChange={setValue}
          onPlaceSelect={() => undefined}
        />
      );
    };

    const firstRender = render(<Wrapper />);
    await waitFor(() =>
      expect(screen.getByText(TEST_LABELS.readyLabel)).toBeInTheDocument(),
    );

    firstRender.unmount();

    render(<Wrapper />);

    await waitFor(() =>
      expect(screen.getByText(TEST_LABELS.readyLabel)).toBeInTheDocument(),
    );

    await user.type(screen.getByRole("combobox"), "올림");

    await waitFor(() =>
      expect(
        screen.getByRole("option", { name: /올림픽공원 체조경기장/ }),
      ).toBeInTheDocument(),
    );
  });

  it("키보드로 항목을 이동하고 Enter로 선택할 수 있다", async () => {
    const user = userEvent.setup();
    const predictionsByInput = {
      잠실: [
        {
          description: "잠실실내체육관, 서울 송파구",
          place_id: "place-1",
          structured_formatting: {
            main_text: "잠실실내체육관",
            secondary_text: "서울 송파구",
          },
        },
        {
          description: "잠실주경기장, 서울 송파구",
          place_id: "place-2",
          structured_formatting: {
            main_text: "잠실주경기장",
            secondary_text: "서울 송파구",
          },
        },
      ],
    };
    const { PlaceAutocompleteInput } = await loadComponent({
      scriptMode: "load",
      withGoogleService: true,
      predictionsByInput,
    });

    const Wrapper = () => {
      const [value, setValue] = useState("");
      const [placeId, setPlaceId] = useState("");

      return (
        <PlaceAutocompleteInput
          {...baseProps}
          value={value}
          placeId={placeId}
          onChange={(nextValue) => {
            setValue(nextValue);
            setPlaceId("");
          }}
          onPlaceSelect={(place) => {
            setValue(place.name);
            setPlaceId(place.placeId ?? "");
          }}
        />
      );
    };

    render(<Wrapper />);

    const input = screen.getByRole("combobox");
    await user.type(input, "잠실");

    await waitFor(() =>
      expect(screen.getByText("잠실주경기장")).toBeInTheDocument(),
    );

    await user.keyboard("{ArrowDown}{Enter}");

    await waitFor(() =>
      expect(screen.getByDisplayValue("잠실주경기장")).toBeInTheDocument(),
    );
    expect(screen.getByText(TEST_LABELS.selectedLabel)).toBeInTheDocument();
  });

  it("결과가 없으면 empty 상태를 표시한다", async () => {
    const user = userEvent.setup();
    const { PlaceAutocompleteInput } = await loadComponent({
      scriptMode: "load",
      withGoogleService: true,
      predictionsByInput: {},
    });

    const Wrapper = () => {
      const [value, setValue] = useState("");

      return (
        <PlaceAutocompleteInput
          {...baseProps}
          value={value}
          onChange={setValue}
          onPlaceSelect={() => undefined}
        />
      );
    };

    render(<Wrapper />);

    await user.type(screen.getByRole("combobox"), "없는장소");

    await waitFor(() =>
      expect(screen.getByText(TEST_LABELS.emptyLabel)).toBeInTheDocument(),
    );
  });

  it("script load 실패나 service unavailable이면 error fallback을 표시한다", async () => {
    const { PlaceAutocompleteInput } = await loadComponent({
      apiKey: "test-key",
      scriptMode: "error",
      withGoogleService: false,
    });

    render(
      <PlaceAutocompleteInput
        {...baseProps}
        value=""
        onChange={() => undefined}
        onPlaceSelect={() => undefined}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(TEST_LABELS.errorLabel)).toBeInTheDocument(),
    );
  });

  it("마우스로 항목을 선택하면 placeId와 이름을 반영한다", async () => {
    const user = userEvent.setup();
    const predictionsByInput = {
      kspo: [
        {
          description: "KSPO DOME, 서울 송파구",
          place_id: "ChIJPLACE123",
          structured_formatting: {
            main_text: "KSPO DOME",
            secondary_text: "서울 송파구",
          },
        },
      ],
    };
    const { PlaceAutocompleteInput } = await loadComponent({
      scriptMode: "load",
      withGoogleService: true,
      predictionsByInput,
    });

    const Wrapper = () => {
      const [value, setValue] = useState("");
      const [placeId, setPlaceId] = useState("");

      return (
        <PlaceAutocompleteInput
          {...baseProps}
          value={value}
          placeId={placeId}
          onChange={(nextValue) => {
            setValue(nextValue);
            setPlaceId("");
          }}
          onPlaceSelect={(place) => {
            setValue(place.name);
            setPlaceId(place.placeId ?? "");
          }}
        />
      );
    };

    render(<Wrapper />);

    await user.type(screen.getByRole("combobox"), "kspo");

    const option = await screen.findByRole("button", { name: /KSPO DOME/ });
    await user.click(option);

    await waitFor(() =>
      expect(screen.getByDisplayValue("KSPO DOME")).toBeInTheDocument(),
    );
    expect(screen.getByText(TEST_LABELS.selectedLabel)).toBeInTheDocument();
  });

  it("포인터 선택 경로에서도 항목을 선택할 수 있다", async () => {
    const user = userEvent.setup();
    const predictionsByInput = {
      kspo: [
        {
          description: "KSPO DOME, 서울 송파구",
          place_id: "ChIJPLACE123",
          structured_formatting: {
            main_text: "KSPO DOME",
            secondary_text: "서울 송파구",
          },
        },
      ],
    };
    const { PlaceAutocompleteInput } = await loadComponent({
      scriptMode: "load",
      withGoogleService: true,
      predictionsByInput,
    });

    const Wrapper = () => {
      const [value, setValue] = useState("");
      const [placeId, setPlaceId] = useState("");

      return (
        <PlaceAutocompleteInput
          {...baseProps}
          value={value}
          placeId={placeId}
          onChange={(nextValue) => {
            setValue(nextValue);
            setPlaceId("");
          }}
          onPlaceSelect={(place) => {
            setValue(place.name);
            setPlaceId(place.placeId ?? "");
          }}
        />
      );
    };

    render(<Wrapper />);

    await user.type(screen.getByRole("combobox"), "kspo");

    const option = await screen.findByRole("button", { name: /KSPO DOME/ });
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    await waitFor(() =>
      expect(screen.getByDisplayValue("KSPO DOME")).toBeInTheDocument(),
    );
    expect(screen.getByText(TEST_LABELS.selectedLabel)).toBeInTheDocument();
  });
});
