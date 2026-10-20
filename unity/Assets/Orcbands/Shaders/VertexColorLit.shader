Shader "Orcbands/VertexColorLit"
{
    Properties
    {
        _Tint ("Tint", Color) = (1,1,1,1)
        _Unlit ("Fire emission", Range(0,1)) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        Cull Off
        CGPROGRAM
        #pragma surface surf Lambert fullforwardshadows
        #pragma target 3.0
        fixed4 _Tint;
        half _Unlit;
        struct Input { float4 color : COLOR; float3 worldPos; };

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
            float3 distant = lerp(luminance.xxx, baseColor, .38) * .24;
            distant = lerp(distant, float3(.035, .052, .057), .38);
            return lerp(baseColor, distant, obscured);
        }

        void surf(Input IN, inout SurfaceOutput o)
        {
            float3 shaded = CampShade(IN.color.rgb * _Tint.rgb, IN.worldPos);
            o.Albedo = shaded * (1.0 - _Unlit);
            o.Emission = shaded * _Unlit;
            o.Alpha = 1;
        }
        ENDCG
    }
    FallBack "Diffuse"
}
