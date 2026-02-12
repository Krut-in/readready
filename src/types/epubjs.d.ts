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

    export interface ThemeOptions {
        [key: string]: {
            [key: string]: string;
        };
    }

    export class Rendition {
        settings: any;
        themes: {
            register(name: string, styles: string | object): void;
            register(themes: { [key: string]: string | object }): void;
            select(name: string): void;
            fontSize(size: string): void;
            font(font: string): void;
        };
        display(target?: string): Promise<void>;
        next(): Promise<void>;
        prev(): Promise<void>;
        destroy(): void;
        location: {
            start: { cfi: string };
            end: { cfi: string };
        };
        views(): any[];
        annotations: {
            add(type: string, cfiRange: string, data?: any, cb?: any, className?: string): void;
            remove(cfiRange: string, type: string): void;
        };

        on(event: 'relocated', listener: (location: Location) => void): void;
        on(event: 'selected', listener: (cfiRange: string, contents: any) => void): void;
        on(event: 'markClicked', listener: (cfiRange: string, data: any, contents: any) => void): void;
        on(event: string, listener: Function): void;
        off(event: string, listener?: Function): void;
        getRange(cfiRange: string): Range;
    }

    export class Book {
        constructor(url?: string | ArrayBuffer, options?: BookOptions);
        renderTo(element: string | HTMLElement, options?: RenditionOptions): Rendition;
        destroy(): void;
        loaded: {
            navigation: Promise<any>;
            metadata: Promise<any>;
            cover: Promise<string>;
        };
        spine: {
            get(target: string | number): any;
        };
        archive: any;
    }

    function ePub(url?: string | ArrayBuffer, options?: BookOptions): Book;
    export default ePub;
}
