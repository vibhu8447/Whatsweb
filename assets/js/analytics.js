// listenToClickScheduleMessage();

listenToScheduleSend();
listenToCampainBtn();
listenToCreateList();
listenToCreateCampain();
listenToCreateTemplate();
listenToTemplateSelect();
listenToListSelect();
listentoNextLsit();
listentoNextTemplate();
listentoChatByNumber()
listenToPremiumPopUp();
listenToSaveFollowUp();
function listenToSaveFollowUp()
{

  const element=document.getElementById("submitCrmData");
  element.addEventListener('analytics', function (e) {
    
      console.log("Listening to lsitenToSaveFollowUp ");
    ga('send', 'event', 'Save FollowUp '); 
 
    }, false);
}

 
  // function listenToPayNowButton()
  // {

  //   const element=document.getElementById("PayButton3");
  //   element.addEventListener('analytics', function (e) {
  //     ga('create', 'UA-207023293-1', 'auto');
  //       console.log("Listening to PayNow Button");
  //     ga('send', 'event', 'PayNow Button'); 
   
  //     }, false);
  // }


  // function listenToPayNow() { // paynow button
  //   const elements = document
  //  .querySelectorAll("#payNow");
    
  //  console.log("alll payynows" , elements)
    
  //  elements.forEach(element => {
  //   // Listen for the event.
  //   element.addEventListener('analytics', function (e) {
    
  //   console.log('working for payynow');
  //   // ga('send', 'event', 'testing3'); 
    
  //   }, false);
  //  });
    
  //  }
  //  listenToPayNow();


 function listenToPremiumPopUp(){
   const element=document.getElementById("PremiumPopup");
   element.addEventListener('analytics', function (e) {
    ga('create', 'UA-207023293-1', 'auto');
      console.log("Listening to Premium Pop Up");
    ga('send', 'event', 'Premium Pop Up'); 
 
    }, false);
 }

// function listenToDelteMessage() { // schedule send button
//     const element =  document.getElementById("Delete_Message");
//     // Listen for the event.
//     console.log("Listening to Delete Message22222");
//     element.addEventListener('analytics', function (e) {
//         console.log("Listening to Delte Message");
//         ga('create', 'UA-207023293-1', 'auto');
//         ga('send', 'event', 'Delete Scheduled Message'); 
//       }, false);
// };
// listenToDelteMessage();

function listentoChatByNumber(){
  const element = document.getElementById("addNewOkay1")

 
   element.addEventListener('analytics', function (e) {
   ga('create', 'UA-207023293-1', 'auto');
     console.log("Listening to ChatByNumber");
   ga('send', 'event', 'Open ChatByNumber'); 

   }, false);
     
}

function listentoNextTemplate(){
  const element = document.getElementById("next_template")

 
   element.addEventListener('analytics', function (e) {
   ga('create', 'UA-207023293-1', 'auto');
     console.log("Listening to Template Next");
   ga('send', 'event', 'Template Next'); 

   }, false);
     
}

 function listentoNextLsit(){
   const element = document.getElementById("next_list")

  
    element.addEventListener('analytics', function (e) {
    ga('create', 'UA-207023293-1', 'auto');
      console.log("Listening to List Next");
    ga('send', 'event', 'List Next'); 

    }, false);
      
 }

function listenToListSelect() { // schedule send button
  const element = document.getElementById("inputGroupSelect022h");

  
element.addEventListener('analytics', function (e) {
ga('create', 'UA-207023293-1', 'auto');
  console.log("Listening to List Select");
ga('send', 'event', ' List Select'); 

}, false);
};


function listenToTemplateSelect() { // schedule send button
  const element = document.getElementById("inputGroupSelect023h");

  // Listen for the event.
  console.log("Listening to Template Select");
element.addEventListener('analytics', function (e) {
ga('create', 'UA-207023293-1', 'auto');
  console.log("Listening to Template Select");
ga('send', 'event', ' Template Select'); 

}, false);
};

function listenToScheduleSend() { // schedule send button
    const element = document.getElementById("scheduleSend");
  
element.addEventListener('analytics', function (e) {
  ga('create', 'UA-207023293-1', 'auto');
    console.log("Listening to Schedule message");
ga('send', 'event', 'Schedule Message'); 

}, false);
  };




  function listenToCreateList() { // schedule send button
  
    const element =document.getElementById("create_new_list");
   
  
    element.addEventListener('analytics', function (e) {
      console.log("listening to Create new list");
      ga('create', 'UA-207023293-1', 'auto');
      // ga('send', 'event', 'CreateNewTemplate'); 
        ga('send', 'event', 'CreateNewList'); 

}, false);
  };
  
  function listenToCreateTemplate() { // schedule send button
  
    const element =document.getElementById("create_new_template");
  
    element.addEventListener('analytics', function (e) {
      console.log("listening to Create new Template ");
      ga('create', 'UA-207023293-1', 'auto');
      ga('send', 'event', 'CreateNewTemplate'); 

}, false);
  };

  function listenToCreateCampain() { // schedule send button
  
    const element =document.getElementById("send_btn");

    element.addEventListener('analytics', function (e) {
      console.log("listening to Create new Campain");
      ga('create', 'UA-207023293-1', 'auto');
      // ga('send', 'event', 'CreateNewTemplate'); 
        ga('send', 'event', 'CreateNewCampain'); 

}, false);
  };

  function listenToClickScheduleMessage() { // schedule send button

    const element =document.getElementById("schedulingButton");

    element.addEventListener('analytics', function (e) {
      console.log("listening to Schedule button is clicked");
      ga('create', 'UA-207023293-1', 'auto');
      // ga('send', 'event', 'CreateNewTemplate'); 
        ga('send', 'event', 'Schedule Clicked'); 

}, false);
  };
  
  function listenToCampainBtn()
  {
    const element=document.getElementById("campainBtn");
    element.addEventListener('analytics', function (e) {
      console.log("listening to Campain button is clicked");
      ga('create', 'UA-207023293-1', 'auto');
      // ga('send', 'event', 'CreateNewTemplate'); 
        ga('send', 'event', 'CampainBtn Clicked'); 

}, false);
  }

  
  
  