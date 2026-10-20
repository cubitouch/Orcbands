Shader "Hidden/Orcbands/FilmicGrade"
{
    Properties { _MainTex ("Source", 2D) = "white" {} }
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
            // The source browser renderer uses ACES filmic tone mapping.
            // A lightweight equivalent for Built-in Unity/WebGL preserves
            // bright fire/sun details without flat clipping or plastic whites.
            half4 frag(v2f_img i) : SV_Target
            {
                float4 sampleColor = tex2D(_MainTex, i.uv);
                float3 source = max(sampleColor.rgb, 0);
                float3 exposed = source * .86;
                float3 mapped = saturate((exposed * (2.51 * exposed + .03)) /
                    (exposed * (2.43 * exposed + .59) + .14));
                float luma = dot(mapped, float3(.2126,.7152,.0722));
                mapped = lerp(float3(luma, luma, luma), mapped, .94);
                return float4(mapped, sampleColor.a);
            }
            ENDCG
        }
    }
    Fallback Off
}
