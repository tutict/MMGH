import { IonItem, IonIcon, IonLabel } from "@ionic/react";
import { Link } from "react-router-dom";
import { listCircle } from "ionicons/icons";

function NavigationItem({ to, color, label, subtitle }) {
  return (
    <Link to={to} className={`menu-link menu-link--${color}`}>
      <IonItem button detail={false} className="menu-link-item">
        <IonIcon
          color={color}
          slot="start"
          icon={listCircle}
          size="large"
        ></IonIcon>
        <IonLabel>
          <h2>{label}</h2>
          {subtitle && <p>{subtitle}</p>}
        </IonLabel>
      </IonItem>
    </Link>
  );
}

export default NavigationItem;
