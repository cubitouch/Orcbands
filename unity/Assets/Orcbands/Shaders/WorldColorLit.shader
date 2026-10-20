Shader "Orcbands/WorldColorLit"
{
    Properties { _Color ("Albedo", Color) = (1,1,1,1) }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        LOD 200
        Cull Off
        CGPROGRAM
        #pragma surface surf Lambert fullforwardshadows finalcolor:FinalizeColor
        #pragma target 3.0
        fixed4 _Color;
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
            float3 distant = lerp(float3(luminance, luminance, luminance), baseColor, .55) * .53;
            distant = lerp(distant, float3(.072, .102, .096), .25);
            return lerp(baseColor, distant, obscured);
        }

        void surf(Input IN, inout SurfaceOutput o)
        {
            o.Albedo = _Color.rgb;
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
