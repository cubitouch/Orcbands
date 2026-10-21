Shader "Orcbands/WorldColorLit"
{
    Properties
    {
        _Color ("Albedo", Color) = (1,1,1,1)
        _SurfaceContrast ("Material tonal depth", Range(.85,1.35)) = 1
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        Cull Off
        CGPROGRAM
        #pragma surface surf Lambert fullforwardshadows finalcolor:FinalizeColor
        #pragma target 3.0
        fixed4 _Color;
        half _SurfaceContrast;
        struct Input { float3 worldPos; };

        float4 _CampRevealSources[6];
        float _CampFogEnabled;
        // Distance fog from the original Three.js scene (85–135m).
        // Unity's surface-shader finalcolor path does not reliably inherit
        // built-in fog on WebGL, so apply it explicitly after camp visibility.
        float3 _CampAtmosphereColor;
        float _CampAtmosphereEnabled;
        // Stable camp-centred woodland horizon, independent of RTS camera pan,
        // orbit and zoom. This is not the six-source fog-of-war visibility mask.
        float4 _CampAtmosphereOrigin;
        float3 CampShade(float3 baseColor, float3 world)
        {
            // Each source contributes a feathered circle of visibility.
            // The previous maximum of six hard-edged distance fields made
            // their union read like a large bright rectangle around the camp.
            // Gaussian influence is continuous, and probabilistic union keeps
            // overlapping hut/torch reveal pools from forming straight seams.
            float concealed = 1.0;
            [unroll] for (int i = 0; i < 6; i++)
            {
                float3 source = _CampRevealSources[i].xyz;
                float2 offset = world.xz - source.xy;
                float sigma = max(1.0, source.z * .90);
                float gaussian = exp(-.5 * dot(offset, offset) / (sigma * sigma));
                concealed *= 1.0 - gaussian;
            }
            float obscured = saturate(concealed) * _CampFogEnabled;
            float luminance = dot(baseColor, float3(.2126, .7152, .0722));
            // Port the original Three.js visibility attenuation verbatim.
            // Keep subdued tree and terrain detail outside the revealed camp.
            // The Three.js output is linear and tone-mapped afterwards;
            // Unity's gamma-space WebGL surface output is not equivalent.
            // Lift hidden detail before the grade so the edge reads as a
            // muted woodland, not black cut-out triangles.
            // Keep the distant pine silhouettes readable like the original
            // WebGL grove; the filmic pass otherwise crushes their dark detail.
            // This only changes the unrevealed forest, never the lit camp.
            float3 distant = lerp(float3(luminance, luminance, luminance),
                                   baseColor, .43) * .53;
            distant = lerp(distant, float3(.12, .15, .13), .29);
            return lerp(baseColor, distant, obscured);
        }

        void surf(Input IN, inout SurfaceOutput o)
        {
            // Expand the tonal separation already present in the original
            // pine OBJ/MTL needle-light and needle-shadow material swatches.
            o.Albedo = saturate((_Color.rgb - .25) * _SurfaceContrast + .25);
            o.Alpha = 1;
        }
        // Three.js applies visibility to the already-lit pixel. Applying
        // it to albedo made Unity's bright camp and outer trees diverge.
        void FinalizeColor(Input IN, SurfaceOutput o, inout fixed4 color)
        {
            color.rgb = CampShade(color.rgb, IN.worldPos);
            // The old camera-relative distance blend swept grey bands
            // over stationary trees during RTS navigation.
            // Fix the distant fade in world space around the original clearing.
            float worldDistance = distance(IN.worldPos.xz, _CampAtmosphereOrigin.xy);
            float atmosphericFog = smoothstep(85.0, 135.0, worldDistance)
                                   * _CampAtmosphereEnabled;
            color.rgb = lerp(color.rgb, _CampAtmosphereColor,
                             atmosphericFog);
        }
        ENDCG
    }
    FallBack "Diffuse"
}
