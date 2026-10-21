Shader "Hidden/Orcbands/FilmicGrade"
{
    Properties
    {
        _MainTex ("Source", 2D) = "white" {}
        _Exposure ("Scene exposure", Range(.6, 1.2)) = .83
        _Contrast ("Midtone contrast", Range(1, 1.35)) = 1.17
        _Saturation ("Subtle saturation", Range(.85, 1.2)) = 1.07
    }
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #pragma target 3.0
            #include "UnityCG.cginc"

            sampler2D _MainTex;
            float _Exposure, _Contrast, _Saturation;

            half4 frag(v2f_img i) : SV_Target
            {
                float4 sampleColor = tex2D(_MainTex, i.uv);
                float3 source = max(sampleColor.rgb, 0);
                // ACES-style highlight rolloff, followed by an intentionally
                // restrained midtone toe. The old .96 exposure plus strong
                // ambient fill made foliage and camp ground pastel/flat.
                float3 exposed = source * _Exposure;
                float3 mapped = saturate((exposed * (2.51 * exposed + .03)) /
                    (exposed * (2.43 * exposed + .59) + .14));
                mapped = saturate((mapped - .38) * _Contrast + .38);
                // Retain natural greens and warm fire, not neon highlights.
                float luminance = dot(mapped, float3(.2126, .7152, .0722));
                mapped = saturate(lerp(float3(luminance, luminance, luminance),
                                      mapped, _Saturation));
                return float4(mapped, sampleColor.a);
            }
            ENDCG
        }
    }
    Fallback Off
}
