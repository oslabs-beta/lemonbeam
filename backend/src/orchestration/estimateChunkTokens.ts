import { get_encoding } from "tiktoken";

const encoder = get_encoding("o200k_base");

function estimateTokens(text: string): number {
    return encoder.encode(text).length;
}

export { estimateTokens }; 
