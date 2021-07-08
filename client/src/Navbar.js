import { Link } from "react-router-dom";
const Navbar = () => {
    return (  
        <nav className="navbar">
             <img src="https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b?ver=5c31" alt="logo" width="150"/>
            <div className="links">
                <Link to="/">Home</Link>

            </div>
        </nav>
    );
}
 
export default Navbar;