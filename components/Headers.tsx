"use client";

import Image from "next/image";
import Link from "next/link";
import logo from "@/images/logo.png";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import SearchBar from "./SearchBar";

function Header() {
  return (
    <div className="border-b ">
      <div className="flex flex-col lg:flex-row items-center gap-4 p-4">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <Link href="/" className="shrink-0 font-bold">
            <Image
              src={logo}
              alt="logo"
              width={100}
              height={100}
              className="w-24 lg:w-28"
            />{" "}
          </Link>

          <div className="lg:hidden">
            <Show when="signed-in">
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="bg-blue-600 text-gray-200 hover:text-gray-600 px-3 py-1.5 hover:bg-gray-100 transition border border-gray-300 rounded-3xl">
                  Sign In
                </button>
              </SignInButton>
            </Show>
          </div>
        </div>
        {/* Search bar - full width on mobile */}
        <div className="w-full lg:max-w-2xl">
          <SearchBar />
        </div>

        {/* for desktop */}
        <div className="hidden lg:block ml-auto">
          <Show when="signed-in">
            <div className="flex items-center gap-3">
              <Link href="/seller">
                <button className="bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition">
                  Sell Tickets
                </button>
              </Link>

              <Link href="/tickets">
                <button className="bg-gray-100 text-gray-800 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                  My Tickets
                </button>
              </Link>
              <UserButton />
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="bg-gray-100 text-gray-800 px-3 py-1.5 hover:bg-gray-200 transition border border-gray-300">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
        {/* For Mobile Action Button */}
        <div className="lg:hidden w-full flex justify-center gap-3">
          <Show when="signed-in">
            <Link href="/seller" className="flex-1">
              <button className=" w-full bg-blue-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-blue-700 transition">
                Sell Tickets
              </button>
            </Link>

            <Link href="/tickets" className="flex-1">
              <button className="w-full bg-gray-100 text-gray-800 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-200 transition border border-gray-300">
                My Tickets
              </button>
            </Link>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default Header;
