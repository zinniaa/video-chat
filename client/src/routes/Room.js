import React, { useRef, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import io from "socket.io-client";
import mic from "./../assets/icons8-microphone-24.png";
import vid from "./../assets/video.png";
import video_off from "./../assets/video_off.png";
import chat from "./../assets/chat.png";
import end_call from "./../assets/leave_call.png";
import mute from "./../assets/mute.png";

const Room = (props) => {
    const userVideo = useRef();
    const partnerVideo = useRef(false);
    const peerRef = useRef();
    const socketRef = useRef();
    const otherUser = useRef();
    const userStream = useRef();
    const sendChannel=useRef(0);
    const [peerVid,setpeerVid]=useState(false);

    const [text, setText]=useState("");
    const [messages, setMessages]=useState([]);
    
    const [isCopied, setIsCopied] = useState(false); 
    
    const [micState,setmicState]=useState(mic);
    const [audio_off,setaudioOff]=useState(false);
    const [vidState,setvidState]=useState(vid);
    const [vid_off,setVideoOff]=useState(false);
    const [chat_on,setChatOn]=useState(false);


    const history=useHistory();
    const ownUserName=props.location.state;
    const [peerUserName, setPeerUserName]=useState("");

  


    useEffect(() => {
        
        navigator.mediaDevices.getUserMedia({ audio: true,video: true })// 
        .then(stream => {

            userVideo.current.srcObject = stream;       //webcam video
            userStream.current = stream;                //local stream

            console.log(ownUserName);

            socketRef.current = io.connect("/");
            socketRef.current.emit("join room", props.match.params.roomID);// emit join room event
            console.log("Joined room cient");

            socketRef.current.on('other user', userID => { //get the userID of 1st person already in room
                callUser(userID);
                otherUser.current = userID;
            });

            socketRef.current.on("user joined", userID => { //get the userID of the 2nd person joinig room
                otherUser.current = userID;
            });

            socketRef.current.on("offer", handleRecieveCall);//for local peer

            socketRef.current.on("answer", handleAnswer);//for remote peer

            socketRef.current.on("ice-candidate", handleNewICECandidateMsg);

            socketRef.current.on("disconnect-call", closeVideoCall);
            
        });

    },[]);

    function callUser(userID) {                                     
        console.log("Call user");
        peerRef.current = createPeer(userID);                       //new peer
        userStream.current.getTracks().forEach(track =>
            peerRef.current.addTrack(track, userStream.current));  //push tracks from local stream to peer connection
       //
        sendChannel.current=peerRef.current.createDataChannel("sendChannel");    // Creating data channel for chat feature
        sendChannel.current.onmessage=handleReceiveMessage;                      // function fired when msg arrives on the channel
        

    }

    function handleReceiveMessage(e){
        console.log("Handle Receive Msg");
        setMessages(messages=>[...messages,{yours:false, value:e.data}]);
    }

    function createPeer(userID) {
        console.log("Create Peer");
        const peer = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.stunprotocol.org"
                },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                },
            ]
        });

        peer.onicecandidate = handleICECandidateEvent;      //transmit ICE candidate to the other peer through signaling server
        peer.ontrack = handleTrackEvent;                    //called by the local WebRTC layer when a track is added to the connection
        peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);  //called oncetracks are added
        peer.onremovetrack = handleRemoveTrackEvent;
 

        return peer;
    }

    function handleNegotiationNeededEvent(userID) {
        console.log("handleNegotiationNeededEvent");
        peerRef.current.createOffer().then(offer => {
            return peerRef.current.setLocalDescription(offer);
        }).then(() => {
            const payload = {
                name: ownUserName,
                target: userID,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            };
            socketRef.current.emit("offer", payload);
        }).catch(e => console.log(e));
    }

    function handleRecieveCall(incoming) {

        console.log("handleRecieveCall");
        console.log(incoming);
        peerRef.current = createPeer();                             // Peer Connection
        //
        peerRef.current.ondatachannel=(event)=>{                    //Data channel
            sendChannel.current=event.channel;
            sendChannel.current.onmessage=handleReceiveMessage;
        };
        setPeerUserName(incoming.name);
        console.log("Other user: "+incoming.name);
        const desc = new RTCSessionDescription(incoming.sdp);
        peerRef.current.setRemoteDescription(desc).then(() => {
            userStream.current.getTracks().forEach(track => peerRef.current.addTrack(track, userStream.current));
        }).then(() => {
            return peerRef.current.createAnswer();                  //Create sdp answer to offer received 
        }).then(answer => {
            return peerRef.current.setLocalDescription(answer);
        }).then(() => {
            const payload = {
                name: ownUserName,
                target: incoming.caller,
                caller: socketRef.current.id,
                sdp: peerRef.current.localDescription
            }
            
            socketRef.current.emit("answer", payload);
        })

    }

    function handleAnswer(message) {
        console.log("handleAnswer");
        const desc = new RTCSessionDescription(message.sdp);
        peerRef.current.setRemoteDescription(desc).catch(e => console.log(e));
        setPeerUserName(message.name);
            console.log("Other user: "+message.name);
    }

    function handleICECandidateEvent(e) {           //sending ice candidate
        console.log("handleICECandidateEvent");
        if (e.candidate) {
            const payload = {
                target: otherUser.current,
                candidate: e.candidate,
            }
            socketRef.current.emit("ice-candidate", payload);
        }
    }

    function handleNewICECandidateMsg(incoming) {       //receiving ice candidate
        console.log("handleNewICECandidateMsg");
        const candidate = new RTCIceCandidate(incoming);

        peerRef.current.addIceCandidate(candidate)
            .catch(e => console.log(e));
    }

    function handleTrackEvent(e) {
        console.log("handleTractEvent");
        partnerVideo.current.srcObject = e.streams[0];
        setpeerVid(true);

    };

    function handleRemoveTrackEvent(){
        console.log("Rmoved tracks");
        var tracklist=partnerVideo.current.srcObject.getTracks();
        if(tracklist.length===0){
            closeVideoCall();
        }
    } 

    
    
    function handleChange(e) {  //Change the value of text when something written in textarea of chat
        console.log("handle Text Change");
        setText(e.target.value);

    }

    function sendMessage(){                     //Send message to the other person
        console.log("Send msg");
        if(text==="") return;
        if(sendChannel.current!==0 && sendChannel.current.readyState==="open"){
            sendChannel.current.send(text);
            setMessages(messages=>[...messages,{yours:true,value: text}]);
            setText("");
  
        }

    }
    

    function renderMessage(message, index) {
        console.log("Render msg");
        if (message.yours) {                    // if the person is sending msg
            return (
                <div className="MyRow" key={index}>
                    <div className="MyMsg">
                        {message.value}
                    </div>
                </div>

            )
        }
        return (                                //if the person is receiving the msg
            <div className="PartnerRow MyRow">
                <div className="PartnerMessage">
                    {message.value}
                </div>

            </div>
        )
    }
    function onCopyText(){
        navigator.clipboard.writeText(props.location.pathname);
        setIsCopied(true);
        setTimeout(() => {
            setIsCopied(false);
        }, 1000);
    }

    function micHandle(e){
        if(!audio_off){                             //if mic not muted
            setmicState(mute);
            e.target.style.backgroundColor='red';
            setaudioOff(true);
            console.log("Mic muted");

       
        }
        else{                                       //if mic muted
            console.log("Off");
            setmicState(mic);
            e.target.style.backgroundColor='#DBE6FD';
            setaudioOff(false);
            console.log("Mic unmuted");

        } 
        userVideo.current.muted=!audio_off;   
       
    }
    function vidHandle(e){
        if(!vid_off){                             //if mic not muted
            setvidState(video_off);
            e.target.style.backgroundColor='red';
            setVideoOff(true);
            userStream.current.getVideoTracks()[0].enabled=false;
            console.log("Cam off");

       
        }
        else{                                       //if mic muted
            
            setvidState(vid);
            e.target.style.backgroundColor='#DBE6FD';
            setVideoOff(false);
            userStream.current.getVideoTracks()[0].enabled=true;
            console.log("Vid on");

        } 
         //= !(userStream.current.getVideoTracks()[0].enabled);
        //userVideo.video = this.myStream.getVideoTracks()[0].enabled
        

    }
    function chatHandle(e){
        if(chat_on){                             //if chat is already visible
            e.target.style.backgroundColor='#DBE6FD';
            document.getElementsByClassName("Chat")[0].style.display="none";
            setChatOn(false);
            console.log("Chat hidden");

       
        }
        else{                                       //if mic muted

            e.target.style.backgroundColor='#9dadd1';
            document.getElementsByClassName("Chat")[0].style.display="inline";
            setChatOn(true);
            console.log("Chat visible");

        } 
  

    }

    function leaveCall(){
        if (userVideo.current.srcObject) {  
            userVideo.current.srcObject.getTracks().forEach(track => track.stop());    
            userVideo.current.removeAttribute("src");
            userVideo.current.removeAttribute("srcObject"); 
        } 

            const payload = {
                caller: socketRef.current.id,
                target: otherUser.current,
                room:props.match.params.roomID
            };
            closeVideoCall();
            history.push('/');
            socketRef.current.emit("disconnect-call", payload);                
            
            
                
    }

    function closeVideoCall(){
        console.log("Close  video Call");
        if (peerRef.current){
            peerRef.current.ontrack = null;
            peerRef.current.onremovetrack = null;
            peerRef.current.onicecandidate = null;
            peerRef.current.onnegotiationneeded = null;
        

            if (partnerVideo.current.srcObject) {
                partnerVideo.current.srcObject.getTracks().forEach(track => track.stop());
                partnerVideo.current.removeAttribute("src");
                partnerVideo.current.removeAttribute("srcObject");
            }   
        
            peerRef.current.close();
            peerRef.current = null;
            otherUser.current=null;
            setpeerVid(false);
        }




    }
    


 
    return (
        <div className="Container">

            <div className="RoomContainer">

                <div className="Invite" style={{ display: peerVid? 'none' : 'block' }}>
                    <h4>Invite your friend through this link:</h4>
                    <div className="InviteLink">
                        {props.location.pathname}
                    </div> 
                    <button style={{height:'30%'}} onClick={onCopyText}> Copy to ClipBoard</button>
                    <span style={{padding: '2px',display:isCopied? 'inline': 'none'}}>Copied!</span>
                </div>


                <div className="Video">
                    <video  className={peerVid? 'UserVid' : 'Own'} autoPlay ref={userVideo} />
                    
                    <video className="PeerVid"style={{ 
                        display: peerVid? 'inline' : 'none' }} autoPlay  ref={partnerVideo} />

                    <p style={{display: peerVid? 'block' : 'none'}}>{peerUserName}</p>
                    
                </div>


                <div className="Chat">
                    <h2>In call Messages</h2>
                    <div className="Messages">
                     {messages.map(renderMessage)}
                    </div>
                    <textarea value={text} onChange={(e)=>handleChange(e)} placeholder="Send Message" className="MessageBox"></textarea>
                    <button onClick={sendMessage} >Send</button>
               </div>

            </div>
            



            <div className="Controls">
                <button className="Mute" onClick={(e)=>micHandle(e)}><img src={micState} alt="Mic"/></button>
                <button className="VidOff" onClick={(e)=>vidHandle(e)}><img src={vidState}alt="Vdeo"/></button>
                <button className="Msg" onClick={(e)=>chatHandle(e)}><img src={chat} alt="Chat"/></button>
                <button className="Leave" onClick={leaveCall} style={{backgroundColor:'red'}}><img src={end_call} alt="End Call"/></button>
                
            </div>

        </div>

    );
};

export default Room;