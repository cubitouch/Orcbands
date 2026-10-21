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
        #pragma surface surf Lambert fullforwardshadows noforwardadd finalcolor:FinalizeColor
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
            float reveal = -10000.0;
            [unroll] for (int i = 0; i < 6; i++)
            {
                float3 source = _CampRevealSources[i].xyz;
                reveal = max(reveal, source.z - distance(world.xz, source.xy));
            }
            float ripple = sin(world.x * 1.7 + sin(world.z * .9)) * .16
                         + sin(world.z * 2.1 + world.x * .6) * .10;
            float obscured = (1.0 - smoothstep(-5.0, 3.0, reveal + ripple)) * _CampFogEnabled;
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
