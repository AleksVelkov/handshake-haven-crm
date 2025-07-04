import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Capabilities from "@/components/Capabilities";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <div id="features">
        <Features />
      </div>
      <div id="capabilities">
        <Capabilities />
      </div>
    </div>
  );
};

export default Index;
