#include <metal_stdlib>
using namespace metal;

struct SanctumVertexOut {
    float4 position [[position]];
    float2 uv;
};

struct SanctumUniforms {
    float2 viewportSize;
    float  pixelScale;
    float  time;
};

// Zero-VBO fullscreen triangle strip (4 vertices)
vertex SanctumVertexOut sanctumFullscreenVertex(uint vid [[vertex_id]]) {
    const float2 positions[4] = {
        float2(-1.0, -1.0),
        float2( 1.0, -1.0),
        float2(-1.0,  1.0),
        float2( 1.0,  1.0)
    };
    const float2 uvs[4] = {
        float2(0.0, 1.0),
        float2(1.0, 1.0),
        float2(0.0, 0.0),
        float2(1.0, 0.0)
    };

    SanctumVertexOut out;
    out.position = float4(positions[vid], 0.0, 1.0);
    out.uv = uvs[vid];
    return out;
}

// Crisp integer-stepped HD-2D Sanctum obsidian & bronze pixel substrate (100% Nearest-Neighbor quantized, zero blur)
fragment float4 sanctumCryptBackdropFragment(
    SanctumVertexOut in [[stage_in]],
    constant SanctumUniforms &u [[buffer(0)]]
) {
    float scale = max(1.0, u.pixelScale);
    float2 gridPos = floor((in.uv * u.viewportSize) / scale);
    float2 norm = (gridPos * scale) / max(u.viewportSize, float2(1.0));

    // Stepped vertical cathedral vault gradient (quantized to 8 crisp pixel bands)
    float radial = length((norm - float2(0.5, 0.44)) * float2(1.15, 1.0));
    float band = floor(clamp(1.0 - radial, 0.0, 1.0) * 8.0) / 8.0;

    // #05070c crypt abyss -> #0b0e17 iron vault with subtle #785c28 bronze altar rim
    float3 cryptBase = float3(5.0 / 255.0, 7.0 / 255.0, 12.0 / 255.0);
    float3 vaultTone = float3(14.0 / 255.0, 18.0 / 255.0, 30.0 / 255.0);
    float3 color = mix(cryptBase, vaultTone, band * 0.75);

    // Subtle integer Bayer 2x2 pixel-art dither so dark bands never band smoothly
    int gx = int(gridPos.x) & 1;
    int gy = int(gridPos.y) & 1;
    float bayer = float((gx ^ gy) * 2 + gy) * (0.35 / 255.0);
    color += bayer;

    return float4(color, 1.0);
}

// Pure lossless Nearest-Neighbor pixel-art texture blit pass
fragment float4 sanctumNearestBlitFragment(
    SanctumVertexOut in [[stage_in]],
    texture2d<float, access::sample> stageTex [[texture(0)]],
    sampler nearestSampler [[sampler(0)]]
) {
    return stageTex.sample(nearestSampler, in.uv);
}
