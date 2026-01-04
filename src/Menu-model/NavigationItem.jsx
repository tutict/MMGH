import React, { memo } from "react";
import { IonItem, IonIcon, IonLabel } from "@ionic/react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { listCircle } from "ionicons/icons";

function NavigationItem({ to, color = "medium", label, subtitle }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`menu-link menu-link--${color}`}
      aria-current={isActive ? "page" : undefined}
    >
      <IonItem
        button
        detail={false}
        lines="none"
        className={`menu-link-item ${isActive ? "is-active" : ""}`}
      >
        <IonIcon
          color={color}
          slot="start"
          icon={listCircle}
          size="large"
        />
        <IonLabel>
          <h2>{label}</h2>
          {subtitle && <p>{subtitle}</p>}
        </IonLabel>
      </IonItem>
    </Link>
  );
}

export default memo(NavigationItem);
