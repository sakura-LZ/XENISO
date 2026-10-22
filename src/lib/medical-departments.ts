// Official hospital grouping; a representative institution, not a national taxonomy.
export const departmentDirectorySource = "https://www.pkufh.com/Html/Hospitals/Departments/Overview0.html";
export const medicalDepartments = [
  { type: "clinical", label: "临床科室", names: ["呼吸和危重症医学科", "消化内科", "心血管内科", "内分泌内科", "血液内科", "肾脏内科", "老年病内科", "风湿免疫科", "胃肠外科", "肝胆胰外科", "甲状腺乳腺外科", "整形烧伤外科", "骨科", "心脏外科", "胸外科", "泌尿外科", "麻醉科", "重症医学科", "介入血管外科", "妇产生殖医学中心", "儿内科", "小儿外科", "儿童癫痫外科病房", "眼科", "小儿眼科", "耳鼻咽喉－头颈外科", "皮肤性病科", "神经内科", "神经外科", "感染疾病科", "中医、中西医结合科", "急诊科", "放射治疗科", "肿瘤内科", "口腔科", "临床药理研究所", "健康管理中心", "全科医学科", "罕见病医学中心"] },
  { type: "medical_technology", label: "医技科室", names: ["医学影像科", "核医学科", "病理科", "电镜室", "康复医学科", "超声医学科", "内镜中心", "检验科", "药剂科", "临床营养科", "输血科", "病案与临床数据中心"] },
] as const;
