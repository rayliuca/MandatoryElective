function getClasses(year, term) {
  var response=UrlFetchApp.fetch("http://api.schedulestorm.com:5000/v1/unis/UAlberta/1700/all");
  return JSON.parse(response.getContentText())
}

function class_detail_decrypter(schedulestorm_api_response,target_class_prefix, target_class_number) {
//  Logger.log(target_class_number)
  var target_class
  Object.keys(schedulestorm_api_response["classes"]).forEach(function(faculty) {
    Object.keys(schedulestorm_api_response["classes"][faculty]).forEach(function(class_prefix) {
      if (class_prefix==target_class_prefix){
        Object.keys(schedulestorm_api_response["classes"][faculty][class_prefix]).forEach(function(class_number) {
//          Logger.log(class_number)
//          Logger.log(target_class_number)
//          Logger.log((String(class_number)==target_class_number))
          if (String(class_number)===target_class_number){
//            Logger.log("in")
//            Logger.log(schedulestorm_api_response["classes"][faculty][class_prefix][class_number])
            target_class=schedulestorm_api_response["classes"][faculty][class_prefix][String(class_number)]
//            Logger.log(simplify_class(target_class))
          }
        })
      }
    })
  })
  return target_class
}

function course_name_resolver (text) {
  num_counter=0
  courses={}
  for (i=0;i<text.length; i++){
    if (!isNaN(text[i])){
      num_counter++    
    } else {
      num_counter=0
    }
    
    if (num_counter==3) { 
//      Logger.log("num_counter="+num_counter+", i="+i)
      check_uppercase=1
      num_counter=0
      j=i-2
      while (check_uppercase==1) {
        
        if (text[j]===text[j].toUpperCase() || text[j]==" ") {}
        else {
          courses[text.slice(j+2,i-2) + " " + text.slice(i-2,i+2)]={}
          courses[text.slice(j+2,i-2) + " " + text.slice(i-2,i+2)]["pre_fix"]=text.slice(j+2,i-2)
          courses[text.slice(j+2,i-2) + " " + text.slice(i-2,i+2)]["number"]=text.slice(i-2,i+2)
          check_uppercase=0
//          Logger.log(j)
//          Logger.log(i)
        }
        j--
        if (j==0) {
          courses[text.slice(0,i-2) + " " + text.slice(i-2,i+2)]={}
          courses[text.slice(0,i-2) + " " + text.slice(i-2,i+2)]["pre_fix"]=text.slice(0,i-2)
          courses[text.slice(0,i-2) + " " + text.slice(i-2,i+2)]["number"]=text.slice(i-2,i+2)
          check_uppercase=0
//          Logger.log(j)
//          Logger.log(i)
        }
      }
    }
    
  }
  return courses
}

function course_name_resolver_test () {
  Logger.log(course_name_resolver("ECE 302 or E E 340. Credit may be obtained in only one of ECE 303 or E E 350."))
}

function simplify_class(class_obj) {
//  Logger.log(class_obj)
  try {
    class_simple={}
    
    try {
      pre_req=class_obj["description"]["prereq"]
    }
    catch(error) {
      pre_req=""
    }
    if (pre_req.search("only")!=-1) {
      class_simple["pre_req"]=course_name_resolver(pre_req.slice(0,pre_req.search("only")))
      class_simple["forbidden_credit"]=course_name_resolver(pre_req.slice(pre_req.search("only")))
    } else {
      class_simple["pre_req"]=course_name_resolver(pre_req)
    }
    try {
      class_simple["classes"]=class_obj["classes"] // includes LEC SEM LAB
    }
    catch(error) {
      class_simple["classes"]={}
    }
  }
  catch(error) {
  return ""
  }
  
//  Logger.log(class_simple)
  return class_simple
}

function class_time_phraser(text) {
//  Logger.log(text)
  text=text.replace(" - "," ").replace(" . ","")
  keywords=text.split(" ")
  days=[]

  if (keywords[1].search("AM")!=-1) {
    start_time=keywords[1].replace("AM","").replace(":","")
    hr=parseInt(start_time.slice(0,2),10)
    if (hr==24) hr=12
    m=parseInt(start_time.slice(2,4),10)
    start_time=[hr,m]
  }
  if (keywords[1].search("PM")!=-1) {
    start_time=keywords[1].replace("PM","").replace(":","")
    hr=(parseInt(start_time.slice(0,2),10)+12)
    if (hr==24) hr=12
    m=parseInt(start_time.slice(2,4),10)
    start_time=[hr,m]
  }
  
  if (keywords[2].search("AM")!=-1) {
    end_time=keywords[2].replace("AM","").replace(":","")
    hr=parseInt(end_time.slice(0,2),10)
    if (hr==24) hr=12
    m=parseInt(end_time.slice(2,4),10)
    end_time=[hr,m]
  }
  if (keywords[2].search("PM")!=-1) {
    end_time=keywords[2].replace("PM","").replace(":","")
    hr=(parseInt(end_time.slice(0,2),10)+12)
    if (hr==24) hr=12
    m=parseInt(end_time.slice(2,4),10)
    end_time=[hr,m]
  }
  class_time={}
//  Logger.log(start_time)
//  Logger.log(end_time)
  for (hr=start_time[0];hr<=end_time[0];hr++){
    for (m=start_time[1];m<=end_time[1];m+=10){
      class_time[String(hr)+String(m)]="1"
    }
  }
  class_time_week={}
  class_time_week[0]={}
  class_time_week[1]={}
  class_time_week[2]={}
  class_time_week[3]={}
  class_time_week[4]={}
  
  if (keywords[0].search("M")!=-1) {days.push(0); class_time_week[0]=class_time}
  if (keywords[0].search("T")!=-1) {days.push(1); class_time_week[1]=class_time}
  if (keywords[0].search("W")!=-1) {days.push(2); class_time_week[2]=class_time}
  if (keywords[0].search("R")!=-1) {days.push(3); class_time_week[3]=class_time}
  if (keywords[0].search("F")!=-1) {days.push(4); class_time_week[4]=class_time}
  
  return [class_time_week,text]
}

function class_time_extractor(class_arr) {
  LAB={}
  LEC={}
  SEM={}
//  Logger.log(class_arr)
//  Logger.log("length="+class_arr.length)
  for (i=0;i<class_arr.length;i++){
    if (class_arr[i]["type"]=="LAB"){      
      LAB[class_arr[i]["section"]]=class_time_phraser(class_arr[i]["times"][0])
      if (Object.keys(LAB).length!=1){
        LAB_key=Object.keys(LAB)
//        Logger.log(LAB_key)
        for (j=0;j<Object.keys(LAB).length;j++){
//          Logger.log(LAB_key[j])
//          Logger.log(LAB[LAB_key[j]][1])
//          Logger.log(LAB[class_arr[i]["section"]][1])
          if (LAB[LAB_key[j]][1]==LAB[class_arr[i]["section"]][1] && LAB_key[j]!=class_arr[i]["section"]) {
            delete LAB[class_arr[i]["section"]]
            j=Object.keys(LAB).length
          }
        }
      }
    }
    if (class_arr[i]["type"]=="LEC"){
      LEC[class_arr[i]["section"]]=class_time_phraser(class_arr[i]["times"][0])
      if (Object.keys(LEC).length!=1){
        LEC_key=Object.keys(LEC)
//        Logger.log(LEC_key)
        for (j=0;j<Object.keys(LEC).length;j++){
//          Logger.log(LEC_key[j])
//          Logger.log(LEC[LEC_key[j]][1])
//          Logger.log(LEC[class_arr[i]["section"]][1])
          if (LEC[LEC_key[j]][1]==LEC[class_arr[i]["section"]][1] && LEC_key[j]!=class_arr[i]["section"]) {
            delete LEC[class_arr[i]["section"]]
            j=Object.keys(LEC).length
          }
        }
      }
    }
    if (class_arr[i]["type"]=="SEM"){
      SEM[class_arr[i]["section"]]=class_time_phraser(class_arr[i]["times"][0])
      if (Object.keys(SEM).length!=1){
        SEM_key=Object.keys(SEM)
//        Logger.log(SEM_key)
        for (j=0;j<Object.keys(SEM).length;j++){
//          Logger.log(SEM_key[j])
//          Logger.log(SEM[SEM_key[j]][1])
//          Logger.log(SEM[class_arr[i]["section"]][1])
          if (SEM[SEM_key[j]][1]==SEM[class_arr[i]["section"]][1] && SEM_key[j]!=class_arr[i]["section"]) {
            delete SEM[class_arr[i]["section"]]
            j=Object.keys(SEM).length
          }
        }
      }
    }
  }
//  Logger.log(LAB)
//  Logger.log(LEC)
//  Logger.log(SEM)
  return {"LAB":LAB,"LEC":LEC,"SEM":SEM}
}
          
function mandatory_courses_setup (schedulestrom_class_list,array_of_courses){
  
  Logger.log(array_of_courses)
  Logger.log(array_of_courses.length)
  mandatory_classes=[]
  flex_mandatory_classes=[]
  for (course_num=0;course_num<array_of_courses.length;course_num++){
    course=course_text_decoder(array_of_courses[course_num])
    Logger.log(course)
    classes=simplify_class(class_detail_decrypter(schedulestrom_class_list,course[0],course[1]))
    mandatory_times=class_time_extractor(classes["classes"])
//    Logger.log((mandatory_times["LAB"]))
    if (Object.keys(mandatory_times["LAB"]).length==0){}
    else if (Object.keys(mandatory_times["LAB"]).length==1){
      mandatory_classes.push(mandatory_times["LAB"][Object.keys(mandatory_times["LAB"][0])[0]][0])
    }
    else {
      for (j=0;j<Object.keys(mandatory_times["LAB"]).length;j++){
        flex_mandatory_classes.push(mandatory_times["LAB"][Object.keys(mandatory_times["LAB"])[j]][0])
      }
    }
    
    if (Object.keys(mandatory_times["LEC"]).length==0){}
    else if (Object.keys(mandatory_times["LEC"]).length==1){
      mandatory_classes.push(mandatory_times["LEC"][Object.keys(mandatory_times["LEC"])[0]][0])
    }
    else {
      for (j=0;j<Object.keys(mandatory_times["LEC"]).length;j++){
        flex_mandatory_classes.push(mandatory_times["LEC"][Object.keys(mandatory_times["LEC"])[j]][0])
      }
    }
    
    if (Object.keys(mandatory_times["SEM"]).length==0){}
    else if (Object.keys(mandatory_times["SEM"]).length==1){
      mandatory_classes.push(mandatory_times["SEM"][Object.keys(mandatory_times["SEM"])[0]][0])
    }
    else {
      for (j=0;j<Object.keys(mandatory_times["SEM"]).length;j++){
        flex_mandatory_classes.push(mandatory_times["SEM"][Object.keys(mandatory_times["SEM"])[j]][0])
      }
    }
    
    
  }
  
  Logger.log(mandatory_classes)
//  Logger.log(flex_mandatory_classes)
  
  return mandatory_classes
}

function course_text_decoder(text) {
  return [text.slice(0,-4), text.slice(-3)]
}



function time_table_init(){
  time_table={}
  for (hr=8;hr<22;hr++){
    for (m=0;m<=60;m+=10) {
      time_table[String(hr)+String(m)]=0
    }  
  }
  time_table_week=[time_table,time_table,time_table,time_table,time_table]
//  Logger.log(time_table_week)
  return time_table_week
}

function mand_fill_time_table(time_table,schedule_arr){
  
  for (sch_num=0;sch_num<schedule_arr.length;sch_num++){
    for (day=0;day<5;day++){
      Logger.log(schedule_arr[sch_num])
      day_keys=Object.keys(schedule_arr[sch_num])
      Logger.log(day_keys)
//      for (j=0;j<day_keys.length;j++){
        
        time_keys=Object.keys(schedule_arr[sch_num][day])
        Logger.log("day="+day)
        Logger.log(schedule_arr[sch_num][day])
        Logger.log(time_keys)
        for (time_num=0;time_num<time_keys.length;time_num++){
          Logger.log("in time for")
          if (time_table[day][time_keys[time_num]]==1){
            Logger.log(schedule_arr[sch_num][day]);
            Logger.log(time_table[day][time_keys[time_num]]);
            Logger.log(time_table);
            return "err"
          }
          else {
            time_table[day][time_keys[time_num]]=1
            Logger.log("set time day="+day)
          }
        }
//      }
    }
   }
  Logger.log("time")
  Logger.log(time_table)
  return time_table
}



function mandatory_courses_setup_test (){
  mandatory_courses_setup (["ECE 303","ECE 341","PHYS 244","PHYS 311","PHYS 372"])
//    mandatory_courses_setup (["ECE 303"])


}

function check_confilct(schedulestrom_class_list,mand_schedule_arr,elect_course){
  for (day=0;day<5;day++) {
    ecect_now=mandatory_courses_setup(schedulestrom_class_list,elect_course)
    for (class_num=0;class_num<ecect_now.length;class_num++){
      for (mand_num=0;mand_num<mand_schedule_arr.length;mand_num++) {
        mand_time_keys=Object.keys(mand_schedule_arr[mand_num][day])
        elect_time_keys=Object.keys(ecect_now[class_num][day])
        dup=elect_time_keys.filter(function(val) {return mand_time_keys.indexOf(val) != -1;});
        if (dup.length!=0) {Logger.log(mand_time_keys);Logger.log(elect_time_keys);Logger.log(dup);return 0}
      }
    }
      
    }
  return 1
  }


function check_confilct_test (){
  courses_list=get_setting()
  mand_class=mandatory_courses_setup(courses_list[1])
  Logger.log(check_confilct(mand_class,["ECE 456"]))
  
}

function main() {
  var schedulestrom_class_list=getClasses("","")
  courses_list=get_setting()
  Logger.log(courses_list[0])
  result = []
  mand_class=mandatory_courses_setup(schedulestrom_class_list,courses_list[1])
  Logger.log("courses_list[0].length)="+courses_list[0].length)
  for (asd=0;asd<courses_list[0].length;asd++) {
    if (check_confilct(schedulestrom_class_list,mand_class,[courses_list[0][asd]])) {
      Logger.log("True")
      result.push(courses_list[0][asd])
    }
  }
  Logger.log(result)
  SpreadsheetApp.getActiveSheet().getRange('A10').setValue(String(result));

}

function get_setting(){
  var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Main");
  var last_row = sheet.getRange("A2:H1000").getValues().filter(String).length;
  var starting_row=2
  var possible_elective_temp=sheet.getRange(starting_row, 3, last_row-starting_row+1, 1).getValues();
  
  possible_elective=[]
  for (i=0;i<possible_elective_temp.length;i++){
    if (possible_elective_temp[i][0]!="") possible_elective.push(possible_elective_temp[i][0])
  }
  
    var mand_course_temp=sheet.getRange(starting_row, 5, last_row-starting_row+1, 1).getValues();
  
  mand_course=[]
  for (i=0;i<mand_course_temp.length;i++){
    if (mand_course_temp[i][0]!="") mand_course.push(mand_course_temp[i][0])
  }
  
    var finished_course_temp=sheet.getRange(starting_row, 7, last_row-starting_row+1, 1).getValues();
  
  finished_course=[]
  for (i=0;i<finished_course_temp.length;i++){
    if (finished_course_temp[i][0]!="") finished_course.push(finished_course_temp[i][0])
  }

//  Logger.log(possible_elective)
//  Logger.log(mand_course)
//  Logger.log(finished_course)
  return [possible_elective,mand_course,finished_course]
}