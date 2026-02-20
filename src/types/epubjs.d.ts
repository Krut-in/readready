declare module 'epubjs' {
  export interface BookOptions {
    openAs?: string;
    encoding?: string;
    replacements?: string;
  }

  export interface RenditionOptions {
    width?: number | string;
    height?: number | string;
    ignoreClass?: string;
    manager?: string;
    view?: string;
    flow?: string;
    layout?: string;
    spread?: string;
    minSpreadWidth?: number;
    stylesheet?: string;
    resizeOnOrientationChange?: boolean;
    script?: string;
    allowScriptedContent?: boolean;
  }

  export interface Location {
    start: {
      cfi: string;
      displayed: { page: number; total: number };
      href: string;
      index: number;
      location: number;
      percentage: number;
    };
    end: {
      cfi: string;
      displayed: { page: number; total: number };
      href: string;
      index: number;
      location: number;
      percentage: number;
    };
    atStart: boolean;
    atEnd: boolean;
  }

  export interface NavItem {
    id: string;
    href: string;
    label: string;
    subitems?: NavItem[];
  }

  export interface Navigation {
    toc: NavItem[];
    landmarks: NavItem[];
  }

  export class Rendition {
    settings: Record<string, unknown>;
    location: Location;
    themes: {
      register(name: string, styles: string | Record<string, unknown>): void;
      register(themes: Record<string, string | Record<string, unknown>>): void;
      select(name: string): void;
      fontSize(size: string): void;
      font(font: string): void;
      /** Injects a per-property CSS override that persists across page turns */
      override(property: string, value: string): void;
    };
    display(target?: string): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    destroy(): void;
    views(): unknown[];
    annotations: {
      add(
        type: string,
        cfiRange: string,
        data?: Record<string, unknown>,
        cb?: (cfiRange: string, data: Record<string, unknown>) => void,
        className?: string,
      ): void;
      remove(cfiRange: string, type: string): void;
    };
    getRange(cfiRange: string): Range;

    on(event: 'relocated', listener: (location: Location) => void): void;
    on(event: 'selected', listener: (cfiRange: string, contents: { window: Window }) => void): void;
    on(event: 'markClicked', listener: (cfiRange: string, data: Record<string, unknown>, contents: { window: Window }) => void): void;
    on(event: 'rendered', listener: (section: unknown, view: unknown) => void): void;
    on(event: string, listener: (...args: unknown[]) => void): void;
    off(event: string, listener?: (...args: unknown[]) => void): void;
  }

  export class Book {
    constructor(url?: string | ArrayBuffer, options?: BookOptions);
    renderTo(element: string | HTMLElement, options?: RenditionOptions): Rendition;
    destroy(): void;
    loaded: {
      navigation: Promise<Navigation>;
      metadata: Promise<Record<string, unknown>>;
      cover: Promise<string>;
    };
    spine: {
      get(target: string | number): unknown;
    };
    archive: unknown;
  }

  function ePub(url?: string | ArrayBuffer, options?: BookOptions): Book;
  export default ePub;
}
