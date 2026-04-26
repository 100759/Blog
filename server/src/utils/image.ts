export function stripImageMetadataFromUrl(url?: string | null) {
    if (!url) {
        return undefined;
    }

    return url.split("#", 2)[0];
}

export function parseImageMetadataFromUrl(url?: string | null) {
    if (!url) {
        return {
            src: undefined,
            blurhash: undefined,
            width: undefined,
            height: undefined,
        };
    }

    const [src, fragment = ""] = url.split("#", 2);
    const params = new URLSearchParams(fragment);
    const width = params.get("width");
    const height = params.get("height");

    return {
        src,
        blurhash: params.get("blurhash") || undefined,
        width: width ? Number.parseInt(width, 10) : undefined,
        height: height ? Number.parseInt(height, 10) : undefined,
    };
}

export function listMarkdownImageUrls(content: string) {
    const imagePattern = /!\[.*?\]\((\S+?)(?:\s+"[^"]*")?\)/g;
    const matches: string[] = [];

    for (const match of content.matchAll(imagePattern)) {
        if (match[1]) {
            matches.push(match[1]);
        }
    }

    return matches;
}

export function listHtmlImageUrls(content: string) {
    const imagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    const matches: string[] = [];

    for (const match of content.matchAll(imagePattern)) {
        if (match[1]) {
            matches.push(match[1]);
        }
    }

    return matches;
}

export function listContentImageUrls(content: string) {
    return [...listMarkdownImageUrls(content), ...listHtmlImageUrls(content)];
}

function findFirstContentImageUrl(content: string) {
    const markdownPattern = /!\[.*?\]\((\S+?)(?:\s+"[^"]*")?\)/g;
    const htmlPattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
    const candidates: Array<{ index: number; url: string }> = [];

    for (const match of content.matchAll(markdownPattern)) {
        if (match[1]) {
            candidates.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, url: match[1] });
        }
    }

    for (const match of content.matchAll(htmlPattern)) {
        if (match[1]) {
            candidates.push({ index: match.index ?? Number.MAX_SAFE_INTEGER, url: match[1] });
        }
    }

    candidates.sort((a, b) => a.index - b.index);
    return candidates[0]?.url;
}

export function contentHasImagesMissingMetadata(content: string) {
    return listContentImageUrls(content).some((url) => {
        const metadata = parseImageMetadataFromUrl(url);
        return !metadata.blurhash || !metadata.width || !metadata.height;
    });
}

export function extractImage(content: string) {
    return stripImageMetadataFromUrl(findFirstContentImageUrl(content));
}

export function extractImageWithMetadata(content: string) {
    return findFirstContentImageUrl(content);
}
