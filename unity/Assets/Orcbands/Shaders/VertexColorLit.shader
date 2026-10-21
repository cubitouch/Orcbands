Shader "Orcbands/VertexColorLit"
{
    Properties
    {
        _Tint ("Tint", Color) = (1,1,1,1)
        _Unlit ("Fire emission", Range(0,1)) = 0
        _FireMotion ("Deform original fire mesh", Range(0,1)) = 0
        _ForestShadowTex ("Original pine sun shadows", 2D) = "white" {}
        _ForestShadowStrength ("Pine shadow strength", Range(0,1)) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        Cull Off
        CGPROGRAM
        #pragma surface surf Lambert fullforwardshadows noforwardadd vertex:AnimateFire finalcolor:FinalizeColor
        #pragma target 3.0
        fixed4 _Tint;
        half _Unlit;
        half _FireMotion;
        float4 _CampFireSources[5];
        sampler2D _ForestShadowTex;
        half _ForestShadowStrength;
        struct Input { float4 color : COLOR; float3 worldPos; };

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

        // Animate the actual Three.js faceted flame triangles, never the
        // hearth stones, tree meshes or decorative world geometry. Flame-base
        // vertices stay anchored while high tips bend and stretch.
        void AnimateFire(inout appdata_full v)
        {
            if (_FireMotion < .5) return;
            float3 world = mul(unity_ObjectToWorld, v.vertex).xyz;
            float4 emitter = _CampFireSources[0];
            float minDistance = 1e9;
            [unroll] for (int i = 0; i < 5; i++)
            {
                float2 offset = world.xz - _CampFireSources[i].xy;
                float distanceSquared = dot(offset, offset);
                if (distanceSquared < minDistance)
                {
                    minDistance = distanceSquared;
                    emitter = _CampFireSources[i];
                }
            }
            float height = max(0, world.y - emitter.z);
            float normalizedHeight = saturate(height / (minDistance < .5 ? 1.05 : 1.1));
            float tipWeight = normalizedHeight * normalizedHeight;
            float t = _Time.y;
            float phase = emitter.w + dot(world.xz, float2(.37, .59));
            // Two frequencies + vertical breathing track the source fire-motion
            // animation while preserving its original source mesh and palette.
            world.x += tipWeight * (.14 * sin(t * 4.4 + phase + height * 1.8)
                                 + .038 * sin(t * 9.2 + phase * 1.7));
            world.z += tipWeight * .09 * sin(t * 3.3 + phase * 1.4 + height);
            world.y += .07 * sin(3.8 * t + phase) * sin(3.14159265 * normalizedHeight);
            v.vertex = mul(unity_WorldToObject, float4(world, 1));
        }

        void surf(Input IN, inout SurfaceOutput o)
        {
            float3 shaded = IN.color.rgb * _Tint.rgb;
            o.Albedo = shaded * (1.0 - _Unlit);
            o.Emission = shaded * _Unlit;
            o.Alpha = 1;
        }
        // Three.js applies visibility to the already-lit pixel. Applying
        // it to albedo made Unity's bright camp and outer trees diverge.
        void FinalizeColor(Input IN, SurfaceOutput o, inout fixed4 color)
        {
            // Shadow silhouettes projected from the approved OBJ pines
            // and the original Three.js sun vector. Unity mirrors world X.
            float2 uv = float2(.5 - IN.worldPos.x / 110.0,
                               .5 + IN.worldPos.z / 110.0);
            float shadow = tex2D(_ForestShadowTex, saturate(uv)).r;
            color.rgb *= lerp(1.0, shadow, _ForestShadowStrength);
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
