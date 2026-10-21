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
            // This is Warcraft-like fog OF WAR, not atmospheric mist.
            // Darken the *existing* lit surface while retaining some local
            // colour/shape detail. Avoid any uniform grey veil/tint.
            float3 detail = lerp(float3(luminance, luminance, luminance),
                                  baseColor, .38);
            float3 hidden = detail * .41 + float3(.005, .012, .009);
            return lerp(baseColor, hidden, obscured);
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
        }
        ENDCG
    }
    FallBack "Diffuse"
}
