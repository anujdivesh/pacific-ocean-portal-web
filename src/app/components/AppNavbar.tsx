"use client";
import Link from "next/link";
import { Navbar, Nav, NavDropdown, Container } from "react-bootstrap";
import styles from "./AppNavbar.module.css";

export default function AppNavbar() {
  return (
    <Navbar bg="light" expand="lg" className={styles.navbarCustom}>
      <Container fluid>
        <div className={styles.navbarFlex}>
          <div className={styles.brandWrapper}>
            <Navbar.Brand as={Link} href="/">
              Pacific Ocean Portal
            </Navbar.Brand>
          </div>
          <div className={styles.rightNav}>
            <Nav className={styles.rightNavLinks}>
              <Nav.Link as={Link} href="/explorer">Explorer</Nav.Link>
              <Nav.Link as={Link} href="/collections">Collections</Nav.Link>
              <Nav.Link as={Link} href="/library">Library</Nav.Link>
              <Nav.Link as={Link} href="/about">About Us</Nav.Link>
              <NavDropdown title="Login" id="login-dropdown" align="end">
                <NavDropdown.Item as={Link} href="/login">Login</NavDropdown.Item>
                <NavDropdown.Item as={Link} href="/signup">Signup</NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </div>
        </div>
      </Container>
    </Navbar>
  );
}
