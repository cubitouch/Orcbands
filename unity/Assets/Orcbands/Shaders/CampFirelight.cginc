#ifndef ORCBANDS_CAMP_FIRELIGHT
#define ORCBANDS_CAMP_FIRELIGHT
        float4 _CampFirePositionRange[5];
        float4 _CampFireRadiance[5];
        float3 CampFirelight(float3 world, float3 normal)
        {
            float3 light = 0;
            [unroll] for (int i = 0; i < 5; i++)
            {
                float3 delta = _CampFirePositionRange[i].xyz - world;
                float distanceSquared = max(dot(delta, delta), .0001);
                float rangeSquared = max(_CampFirePositionRange[i].w * _CampFirePositionRange[i].w, .0001);
                float radiusSquared = distanceSquared / rangeSquared;
                float edge = saturate(1.0 - radiusSquared);
                float attenuation = edge * edge / (1.0 + 25.0 * radiusSquared);
                float diffuse = saturate(dot(normal, delta * rsqrt(distanceSquared)));
                light += _CampFireRadiance[i].rgb * (diffuse * attenuation);
            }
            return light;
        }


#endif
