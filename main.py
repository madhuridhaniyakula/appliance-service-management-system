

from typing import Literal
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, String, Integer
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    sessionmaker,
    Session,
)

# ---------------- DATABASE SETUP ----------------

DATABASE_URL = "sqlite:///./appliance_service.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


class TicketDB(Base):
    __tablename__ = "service_tickets"

    ticket_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(100))
    appliance_type: Mapped[str] = mapped_column(String(50))
    issue_description: Mapped[str] = mapped_column(String(500))
    priority: Mapped[str] = mapped_column(String(10), default="Medium")
    status: Mapped[str] = mapped_column(String(20), default="Open")


class InventoryDB(Base):
    __tablename__ = "inventory"

    part_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    part_name: Mapped[str] = mapped_column(String(100))
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    minimum_stock: Mapped[int] = mapped_column(Integer, default=5)


# Create tables after defining all database models
Base.metadata.create_all(bind=engine)


# ---------------- DATABASE SESSION ----------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------- API SETUP ----------------

app = FastAPI(
    title="Appliance Service Management System",
    description="Manage appliance repair requests and spare-parts inventory",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://appliance-service-management-system.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- REQUEST MODELS ----------------

class ServiceTicket(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    appliance_type: Literal[
        "Refrigerator",
        "Washing Machine",
        "Air Conditioner",
        "Microwave",
    ]
    issue_description: str = Field(min_length=5, max_length=500)
    priority: Literal["Low", "Medium", "High"] = "Medium"
    status: Literal["Open", "In Progress", "Completed"] = "Open"


class InventoryItem(BaseModel):
    part_name: str = Field(min_length=2, max_length=100)
    quantity: int = Field(ge=0)
    minimum_stock: int = Field(default=5, ge=0)


# ---------------- HOME ----------------

@app.get("/")
def home():
    return {
        "message": "Appliance Service Management System is running"
    }


# ---------------- SERVICE TICKET APIs ----------------

@app.post("/tickets", status_code=201)
def create_ticket(
    ticket: ServiceTicket,
    db: Session = Depends(get_db),
):
    new_ticket = TicketDB(**ticket.model_dump())
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket


@app.get("/tickets")
def get_all_tickets(db: Session = Depends(get_db)):
    return db.query(TicketDB).order_by(TicketDB.ticket_id).all()


@app.get("/tickets/{ticket_id}")
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
):
    ticket = db.get(TicketDB, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    return ticket


@app.patch("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    status: Literal["Open", "In Progress", "Completed"],
    db: Session = Depends(get_db),
):
    ticket = db.get(TicketDB, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    ticket.status = status
    db.commit()
    db.refresh(ticket)
    return ticket


@app.delete("/tickets/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
):
    ticket = db.get(TicketDB, ticket_id)

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found",
        )

    db.delete(ticket)
    db.commit()

    return {"message": "Ticket deleted successfully"}


# ---------------- INVENTORY APIs ----------------

@app.post("/inventory", status_code=201)
def add_inventory_item(
    item: InventoryItem,
    db: Session = Depends(get_db),
):
    new_item = InventoryDB(**item.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


@app.get("/inventory")
def get_inventory(db: Session = Depends(get_db)):
    return db.query(InventoryDB).order_by(InventoryDB.part_id).all()


@app.get("/inventory/low-stock")
def get_low_stock_items(db: Session = Depends(get_db)):
    return db.query(InventoryDB).filter(
        InventoryDB.quantity < InventoryDB.minimum_stock
    ).order_by(InventoryDB.part_id).all()
