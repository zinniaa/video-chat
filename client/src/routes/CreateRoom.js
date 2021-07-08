import {v1 as uuid} from "uuid";
import logo from './../assets/teams.png';
import engage from './../assets/engage.png';
import { useState,useEffect } from "react";
import { Link,withRouter } from "react-router-dom";

const CreateRoom = (props) => {

    const [link,setLink]=useState('');
    const [join,setJoin]=useState(false);       //To check when link is entered

    const [uname,setuname]=useState('');
    const [isName,setIsName]=useState(false);   //To check if uname entered 


    useEffect(()=>{
        if (!link){
            setJoin(false);     //if link empty, set join as false
        }
        else{
            setJoin(true);
        }        
    },[link]);


    useEffect(()=>{                 //Rendered whenever user name changes
        if (!uname){
            setIsName(false);     //if link empty, set join as false
        }
        else{
            setIsName(true);
        }       
    },[uname]);


    
    function create(){                          // Create room button clicked
        const id=uuid();                     //generate uid
        props.history.push({
            pathname:`/room/${id}`,
            state:uname
        });   
    }
    

 
    return (  
        <div className="Room">
                <div className="column" id="left">
                    <h1>Welcome to Microsoft Teams</h1>
                    <img src={logo} alt="logo" height="95vh" width="90vh"/><br/><br/><br/>
                    <h1>Create a Meeting or Join a Meeting</h1><br/><br/><br/>
                    <input 
                        type="text" 
                        placeholder="Enter your name*" 
                        onChange={(e)=>setuname(e.target.value)}        // Change the value of user name
                    />

                    <div className="meet">
                        <button onClick={create} disabled={!isName}>Create Room</button>
                        <input 
                            type="text" 
                            placeholder="Enter link to join meeting" 
                            value={link} 
                            onChange={(e)=>setLink(e.target.value)}     //Change the value of link
                        />
                        {join && isName &&  <h3><Link to={{
                                                    pathname: link,
                                                    state: uname}}>
                                                        Join
                                                </Link>
                                            </h3>}
                    </div>
                </div>

                <div className="column">                    
                    <br/><br/><br/><br/><br/>
                    <img src={engage} alt="engage logo"/>
                    <br/><br/><br/><h2>Chat, meet, call, and collaborate all in one place</h2>
                </div>

        </div>
        
    );
}
 
export default withRouter(CreateRoom);