import map from "../../data/occupation_direction_map.json";
import medicine from "../../data/medicine_direction.json";
export const groups = [...map.directions, medicine];
export const directions = groups.flatMap((group) => group.specializations.map((item) => ({ ...item, group_id: group.id, group_name: group.name })));
export type Direction = (typeof directions)[number];
export const occupationUrl = (code: string) => (map.onet_urls as Record<string, string>)[code];
export const findDirection = (id: string) => directions.find((direction) => direction.id === id);
