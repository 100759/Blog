import "../../test/setup";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchPage } from "../search";

const searchMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.keyword) return `${key}:${options.keyword}`;
      if (options?.count !== undefined) return `${key}:${options.count}`;
      if (options?.page !== undefined) return `${key}:${options.page}`;
      return key;
    },
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useSearch: () => "",
}));

vi.mock("../../app/runtime", () => ({
  client: {
    search: {
      search: (...args: unknown[]) => searchMock(...args),
    },
  },
}));

vi.mock("../../hooks/useSiteConfig", () => ({
  useSiteConfig: () => ({
    name: "Rin",
    avatar: "",
    feedLayout: "grid",
    pageSize: 5,
  }),
}));

vi.mock("../../components/loading", () => ({
  Waiting: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("../../components/feed_card", () => ({
  FeedCard: ({ title }: { title: string }) => <article>{title}</article>,
}));

describe("SearchPage", () => {
  beforeEach(() => {
    searchMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders an empty state when no results are returned", async () => {
    searchMock.mockResolvedValue({
      data: {
        size: 0,
        data: [],
        hasNext: false,
      },
    });

    render(<SearchPage keyword="design" />);

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalledWith("design", { page: 1, limit: 5 });
    });

    expect(await screen.findByText("article.search.empty_title")).toBeInTheDocument();
    expect(screen.getAllByText("article.search.empty_description").length).toBeGreaterThan(0);
  });

  it("renders result cards when matches are returned", async () => {
    searchMock.mockResolvedValue({
      data: {
        size: 1,
        data: [
          {
            id: 1,
            title: "Content First",
            summary: "Summary",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        hasNext: false,
      },
    });

    render(<SearchPage keyword="content" />);

    expect(await screen.findByText("Content First")).toBeInTheDocument();
    expect(screen.getByText("article.search.result_hint")).toBeInTheDocument();
  });
});
