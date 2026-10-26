Shader "Orcbands/WorldColorLit"
{
    Properties
    {
        _Color ("Albedo", Color) = (1,1,1,1)
        [HideInInspector] _TreeBendPivot ("Tree strike pivot", Vector) = (0,0,0,0)
        [HideInInspector] _TreeBend ("Tree strike bend", Vector) = (0,0,0,0)
        _SurfaceContrast ("Material tonal depth", Range(.85,1.35)) = 1
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        Cull Off
        CGPROGRAM
        // Match the character path: no depth-competing point-light passes.
        #pragma surface surf Lambert fullforwardshadows addshadow vertex:AnimateTreeStrike noforwardadd novertexlights finalcolor:FinalizeColor
        #pragma target 3.0
        fixed4 _Color;
        half _SurfaceContrast;
        struct Input { float3 worldPos; float3 worldNormal; };
        #include "CampFirelight.cginc"

        float4 _TreeBendPivot;
        float4 _TreeBend;
        // World-space deformation also works on statically batched pine meshes.
        // Only struck-tree renderers receive these property overrides.
        void AnimateTreeStrike(inout appdata_full v)
        {
            if (_TreeBendPivot.w < .5) return;
            float3 world = mul(unity_ObjectToWorld, v.vertex).xyz;
            float height = max(0, world.y - _TreeBendPivot.y);
            float weight = saturate(height / .6);
            world.xz += _TreeBend.xy * height * weight;
            float derivative = weight + (height < .6 ? height / .6 : 0);
            float3 normal = UnityObjectToWorldNormal(v.normal);
            normal.y -= dot(normal.xz, _TreeBend.xy * derivative);
            v.normal = normalize(mul(normal, (float3x3)unity_ObjectToWorld));
            v.vertex = mul(unity_WorldToObject, float4(world, 1));
        }
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
            // The fog mapping is affine: a linear attenuation of lighting
            // plus an ambient colour offset. Unity calls 'finalcolor' once
            // per forward light pass, not only for the final composited pixel.
            // Only the base pass may contribute the constant woodland tint;
            // adding it in ForwardAdd emits a bright tile for each extra
            // point light even where that light contributes zero radiance.
            float3 distant = lerp(float3(luminance, luminance, luminance),
                                   baseColor, .43) * (.53 * .71);
#if !defined(UNITY_PASS_FORWARDADD)
            distant += float3(.12, .15, .13) * .29;
#endif
            return lerp(baseColor, distant, obscured);
        }

        void surf(Input IN, inout SurfaceOutput o)
        {
            // Expand the tonal separation already present in the original
            // pine OBJ/MTL needle-light and needle-shadow material swatches.
            o.Albedo = saturate((_Color.rgb - .25) * _SurfaceContrast + .25);
            o.Emission = o.Albedo * CampFirelight(IN.worldPos, normalize(IN.worldNormal));
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
#if defined(UNITY_PASS_FORWARDADD)
            // ForwardAdd is accumulated over the ForwardBase pass. The
            // distant atmospheric colour is an additive *constant*, so it
            // must not be emitted repeatedly by each point-light pass.
            color.rgb *= 1.0 - atmosphericFog;
#else
            color.rgb = lerp(color.rgb, _CampAtmosphereColor,
                             atmosphericFog);
#endif
        }
        ENDCG
    }
    FallBack "Diffuse"
}
